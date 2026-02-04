// AR Engine Outreach Module
// Handles automated email, SMS, and payment link generation

import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { arEngineLogger as logger } from '@/lib/logger';
import { ScheduledAction, OutreachContent, IncentiveOffer } from './types';

// Stripe integration for payment links
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface PaymentLinkResult {
  url: string;
  id: string;
  expiresAt?: Date;
}

// Generate a Stripe payment link for an invoice
export async function generatePaymentLink(
  invoiceId: string,
  amount: number, // in cents
  clientEmail: string,
  description: string,
  discount?: { percent?: number; amount?: number }
): Promise<PaymentLinkResult> {
  if (!STRIPE_SECRET_KEY) {
    // Return mock link for development
    return {
      url: `https://pay.stripe.com/mock/${invoiceId}`,
      id: `mock_${invoiceId}`,
    };
  }

  try {
    // Dynamic import to avoid issues if stripe not installed
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Calculate final amount after discount
    let finalAmount = amount;
    if (discount?.percent) {
      finalAmount = Math.round(amount * (1 - discount.percent / 100));
    } else if (discount?.amount) {
      finalAmount = amount - discount.amount;
    }

    // Create a payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
              metadata: { invoiceId },
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        originalAmount: amount.toString(),
        discountPercent: discount?.percent?.toString() || '',
        discountAmount: discount?.amount?.toString() || '',
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?invoice=${invoiceId}`,
        },
      },
    });

    return {
      url: paymentLink.url,
      id: paymentLink.id,
    };
  } catch (error) {
    logger.error({ err: error }, '[AR Engine] Failed to create payment link');
    throw error;
  }
}

// Send outreach email
export async function sendOutreachEmail(
  to: string,
  content: OutreachContent,
  invoiceId: string,
  paymentLink?: string,
  incentive?: IncentiveOffer
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Replace payment link placeholder
    let body = content.body;
    if (paymentLink) {
      body = body.replace('[PAYMENT_LINK]', paymentLink);
    }

    // Add incentive details if present
    if (incentive) {
      if (incentive.type === 'early_pay_discount' && incentive.discountPercent) {
        body += `\n\n🎁 Special Offer: Pay within ${getDaysUntil(incentive.expiresAt)} days and save ${incentive.discountPercent}%!`;
      } else if (incentive.type === 'payment_plan' && incentive.paymentPlanMonths) {
        body += `\n\n💳 Need flexibility? We're offering a ${incentive.paymentPlanMonths}-month payment plan.`;
      }
    }

    // Add payment button HTML
    const html = generateEmailHtml(content.subject || 'Payment Reminder', body, paymentLink);

    const result = await sendEmail({
      to,
      subject: content.subject || 'Payment Reminder',
      html,
      text: body,
    });

    // Log the communication
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { clientId: true },
    });

    if (invoice?.clientId) {
      await prisma.communicationLog.create({
        data: {
          clientId: invoice.clientId,
          type: 'email',
          direction: 'outbound',
          subject: content.subject,
          content: body,
          emailMessageId: result.id,
        },
      });
    }

    return { success: true, messageId: result.id };
  } catch (error) {
    logger.error({ err: error }, '[AR Engine] Failed to send email');
    return { success: false, error: String(error) };
  }
}

// Send SMS via Twilio
export async function sendOutreachSMS(
  to: string,
  content: OutreachContent,
  invoiceId: string,
  paymentLink?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: 'SMS not configured - missing Twilio credentials' };
  }

  try {
    // Replace payment link placeholder
    let body = content.body;
    if (paymentLink) {
      body = body.replace('[PAYMENT_LINK]', paymentLink);
    }

    // Truncate SMS to 160 characters if needed (with link consideration)
    const maxLength = paymentLink ? 120 : 160; // Leave room for link
    if (body.length > maxLength) {
      body = body.substring(0, maxLength - 3) + '...';
    }

    // Add payment link at end if present
    if (paymentLink) {
      body += `\n\nPay now: ${paymentLink}`;
    }

    // Format phone number (ensure E.164 format)
    let formattedPhone = to.replace(/[^\d+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume US number if no country code
      formattedPhone = '+1' + formattedPhone.replace(/^1/, '');
    }

    // Dynamic import of Twilio client
    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    // Log the communication
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { clientId: true },
    });

    if (invoice?.clientId) {
      await prisma.communicationLog.create({
        data: {
          clientId: invoice.clientId,
          type: 'sms',
          direction: 'outbound',
          content: body,
          emailMessageId: message.sid, // Using emailMessageId field for SMS SID as well
        },
      });
    }

    return { success: true, messageId: message.sid };
  } catch (error) {
    logger.error({ err: error }, '[AR Engine] Failed to send SMS');
    return { success: false, error: String(error) };
  }
}

// Execute a scheduled action
export async function executeAction(
  action: ScheduledAction,
  invoiceId: string,
  clientEmail: string | null,
  clientPhone: string | null,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate payment link if needed
    let paymentLink: string | undefined;
    if (['email', 'sms', 'payment_link', 'discount_offer', 'payment_plan'].includes(action.type)) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { invoiceNumber: true, client: { select: { name: true } } },
      });

      const result = await generatePaymentLink(
        invoiceId,
        amount,
        clientEmail || '',
        `Invoice ${invoice?.invoiceNumber || invoiceId} - ${invoice?.client?.name || 'Customer'}`,
        action.incentive ? {
          percent: action.incentive.discountPercent,
          amount: action.incentive.discountAmount,
        } : undefined
      );
      paymentLink = result.url;
    }

    // Execute based on type
    switch (action.type) {
      case 'email':
      case 'discount_offer':
      case 'payment_plan':
        if (!clientEmail) {
          return { success: false, error: 'No email address' };
        }
        const emailResult = await sendOutreachEmail(
          clientEmail,
          action.content,
          invoiceId,
          paymentLink,
          action.incentive
        );
        return emailResult;

      case 'sms':
        if (!clientPhone) {
          return { success: false, error: 'No phone number' };
        }
        const smsResult = await sendOutreachSMS(
          clientPhone,
          action.content,
          invoiceId,
          paymentLink
        );
        return smsResult;

      case 'payment_link':
        // Just generate and store the link - used with other outreach
        if (paymentLink) {
          await prisma.invoice.update({
            where: { id: invoiceId },
            data: { notes: `Payment link: ${paymentLink}` },
          });
        }
        return { success: true };

      case 'call':
        // Log the call task for manual follow-up
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { clientId: true },
        });

        if (invoice?.clientId) {
          await prisma.followUpAction.create({
            data: {
              organizationId: (await prisma.invoice.findUnique({
                where: { id: invoiceId },
                select: { organizationId: true },
              }))?.organizationId || '',
              invoiceId,
              clientId: invoice.clientId,
              type: 'call',
              status: 'scheduled',
              notes: action.content.body,
            },
          });
        }
        return { success: true };

      default:
        return { success: false, error: 'Unknown action type' };
    }
  } catch (error) {
    logger.error({ err: error }, '[AR Engine] Failed to execute action');
    return { success: false, error: String(error) };
  }
}

// Process all scheduled actions that are due
export async function processScheduledActions(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const now = new Date();
  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Get all due follow-up actions
  const dueActions = await prisma.followUpAction.findMany({
    where: {
      status: 'scheduled',
      scheduledFor: { lte: now },
    },
    include: {
      invoice: {
        include: { client: true },
      },
    },
    take: 50, // Process in batches
  });

  for (const followUp of dueActions) {
    processed++;

    try {
      const notes = JSON.parse(followUp.notes || '{}');
      const action: ScheduledAction = {
        id: followUp.id,
        type: followUp.type as ScheduledAction['type'],
        scheduledFor: followUp.scheduledFor || new Date(),
        status: 'scheduled',
        content: notes.content || { body: '', tone: 'friendly' },
        incentive: notes.incentive,
      };

      const result = await executeAction(
        action,
        followUp.invoiceId || '',
        followUp.invoice?.client?.email || null,
        followUp.invoice?.client?.phone || null,
        Number(followUp.invoice?.amount || 0) * 100
      );

      if (result.success) {
        successful++;
        await prisma.followUpAction.update({
          where: { id: followUp.id },
          data: {
            status: 'completed',
            completedAt: now,
          },
        });
      } else {
        failed++;
        await prisma.followUpAction.update({
          where: { id: followUp.id },
          data: {
            notes: JSON.stringify({ ...notes, error: result.error }),
          },
        });
      }
    } catch (error) {
      failed++;
      console.error(`[AR Engine] Error processing action ${followUp.id}:`, error);
    }
  }

  return { processed, successful, failed };
}

// Helper functions
function getDaysUntil(date: Date): number {
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function generateEmailHtml(subject: string, body: string, paymentLink?: string): string {
  const buttonHtml = paymentLink
    ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${paymentLink}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Pay Now</a>
      </div>`
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Payment Reminder</h1>
        </div>

        <div style="white-space: pre-line;">
          ${body}
        </div>

        ${buttonHtml}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated reminder. If you have questions, please reply to this email.
        </p>
      </body>
    </html>
  `;
}
