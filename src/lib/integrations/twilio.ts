// Twilio SMS Integration
// Provides SMS sending capabilities for AR collection outreach
// Environment: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

import { arEngineLogger as logger } from '@/lib/logger';

// Lazily cached Twilio client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let twilioClient: any = null;

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  if (!twilioClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

/**
 * Format a phone number to E.164 format.
 * If the number doesn't start with +, assume US and prepend +1.
 */
export function formatPhoneNumber(phone: string): string {
  // Strip everything except digits and leading +
  let formatted = phone.replace(/[^\d+]/g, '');

  if (!formatted.startsWith('+')) {
    // Remove leading 1 if present (avoid +11xxxxxxxxxx)
    formatted = formatted.replace(/^1/, '');
    formatted = '+1' + formatted;
  }

  return formatted;
}

/**
 * Validate that a phone number is in valid E.164 format.
 * Must start with + followed by 10-15 digits.
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

/**
 * Send an SMS message via Twilio.
 * Returns success/failure with the Twilio message SID.
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    logger.debug({ to }, '[Twilio] SMS skipped (Twilio not configured)');
    return { success: false, error: 'SMS not configured - missing Twilio credentials' };
  }

  // Format and validate the phone number
  const formattedTo = formatPhoneNumber(to);
  if (!isValidE164(formattedTo)) {
    return { success: false, error: `Invalid phone number format: ${to}` };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedTo,
    });

    logger.info({ to: formattedTo, sid: result.sid }, '[Twilio] SMS sent successfully');
    return { success: true, messageId: result.sid };
  } catch (error) {
    logger.error({ err: error, to: formattedTo }, '[Twilio] Failed to send SMS');
    return { success: false, error: String(error) };
  }
}

// ============================================
// SMS Templates for AR Collection
// ============================================

export type ARSmsTemplateType = 'friendly' | 'firm' | 'urgent' | 'final';

export interface ARSmsTemplateData {
  clientName: string;
  businessName: string;
  amount: string;
  invoiceNumber: string;
  dueDate: string;
  daysPastDue: number;
  paymentLink?: string;
}

/**
 * Generate an SMS message body for AR collection outreach.
 * Templates are kept concise for SMS character limits.
 */
export function getARSmsTemplate(type: ARSmsTemplateType, data: ARSmsTemplateData): string {
  const link = data.paymentLink ? ` Pay easily here: ${data.paymentLink}` : '';

  switch (type) {
    case 'friendly':
      // 1-15 days overdue
      return `Hi ${data.clientName}, this is a friendly reminder from ${data.businessName} that invoice #${data.invoiceNumber} for ${data.amount} was due on ${data.dueDate}.${link}`;

    case 'firm':
      // 16-30 days overdue
      return `Hi ${data.clientName}, invoice #${data.invoiceNumber} for ${data.amount} from ${data.businessName} is now ${data.daysPastDue} days past due. Please arrange payment at your earliest convenience.${link}`;

    case 'urgent':
      // 31-60 days overdue
      return `${data.clientName}, your account with ${data.businessName} has an outstanding balance of ${data.amount} that is ${data.daysPastDue} days overdue. Immediate attention is required.${link}`;

    case 'final':
      // 60+ days overdue
      return `${data.clientName}, final notice: ${data.amount} owed to ${data.businessName} is seriously overdue (${data.daysPastDue} days). Please contact us immediately or pay here: ${data.paymentLink || '[contact us]'}. Further action may be taken.`;

    default:
      return `Hi ${data.clientName}, you have an outstanding balance of ${data.amount} with ${data.businessName}. Please arrange payment.${link}`;
  }
}

/**
 * Determine the appropriate SMS template type based on days past due.
 */
export function getSmsTemplateTypeForDays(daysPastDue: number): ARSmsTemplateType {
  if (daysPastDue <= 15) return 'friendly';
  if (daysPastDue <= 30) return 'firm';
  if (daysPastDue <= 60) return 'urgent';
  return 'final';
}
