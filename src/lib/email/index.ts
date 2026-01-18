import { Resend } from 'resend';

// Initialize Resend client only if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Simple Growth Solutions <noreply@simplegrowthsolutions.com>';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: EmailOptions) {
  // If Resend is not configured, return success (development mode)
  if (!resend) {
    return { success: true, id: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, id: data?.id };
  } catch (error) {
    throw error;
  }
}

// ===========================================
// EMAIL TEMPLATES
// ===========================================

export async function sendVerificationEmail(email: string, name: string, verifyUrl: string) {
  const subject = 'Verify Your Email - Simple Growth Solutions';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
        </div>

        <h2 style="color: #1f2937;">Verify Your Email Address</h2>

        <p>Hi ${name},</p>

        <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Verify Email Address</a>
        </div>

        <p>This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>

        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; color: #4b5563;">${verifyUrl}</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated email from Simple Growth Solutions. Please do not reply.
        </p>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const subject = 'Welcome to Simple Growth Solutions!';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
        </div>

        <h2 style="color: #1f2937;">Welcome, ${name || 'there'}!</h2>

        <p>Thank you for joining Simple Growth Solutions. We're excited to help you grow your business with our suite of powerful tools:</p>

        <ul style="padding-left: 20px;">
          <li><strong>Website Management</strong> - Professional websites built and managed for you</li>
          <li><strong>Cash Flow AI</strong> - Intelligent invoice tracking and recovery</li>
          <li><strong>Cybersecurity Shield</strong> - Protect your online presence</li>
          <li><strong>Business Chauffeur</strong> - AI-powered business intelligence</li>
        </ul>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <ol style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Complete your organization profile</li>
            <li>Choose your services</li>
            <li>Start growing your business!</li>
          </ol>
        </div>

        <p>If you have any questions, simply reply to this email or visit our help center.</p>

        <p>Best regards,<br>The Simple Growth Solutions Team</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          You're receiving this email because you signed up for Simple Growth Solutions.
        </p>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = 'Reset Your Password - Simple Growth Solutions';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
        </div>

        <h2 style="color: #1f2937;">Reset Your Password</h2>

        <p>We received a request to reset your password. Click the button below to create a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
        </div>

        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>

        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${resetUrl}</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated email from Simple Growth Solutions. Please do not reply.
        </p>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

export async function sendInvoiceReminderEmail(
  email: string,
  clientName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  daysOverdue: number
) {
  const subject = daysOverdue > 0
    ? `Payment Overdue: Invoice ${invoiceNumber}`
    : `Payment Reminder: Invoice ${invoiceNumber}`;

  const urgencyColor = daysOverdue > 30 ? '#dc2626' : daysOverdue > 0 ? '#f59e0b' : '#2563eb';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
        </div>

        <h2 style="color: ${urgencyColor};">${daysOverdue > 0 ? 'Payment Overdue' : 'Payment Reminder'}</h2>

        <p>Dear ${clientName},</p>

        <p>${daysOverdue > 0
          ? `Your invoice is currently ${daysOverdue} days overdue. Please submit payment as soon as possible.`
          : 'This is a friendly reminder about your upcoming payment.'
        }</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: ${urgencyColor};">${amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
            </tr>
          </table>
        </div>

        <p>If you have already sent your payment, please disregard this notice.</p>

        <p>If you have any questions or need to discuss payment arrangements, please contact us.</p>

        <p>Thank you for your business.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated reminder from Simple Growth Solutions.
        </p>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

export async function sendSecurityAlertEmail(
  email: string,
  alertType: 'scan_complete' | 'vulnerability_found' | 'ssl_expiring',
  details: {
    targetUrl: string;
    score?: number;
    criticalCount?: number;
    highCount?: number;
    expiryDate?: string;
  }
) {
  let subject: string;
  let content: string;
  let alertColor = '#2563eb';

  switch (alertType) {
    case 'scan_complete':
      subject = `Security Scan Complete: ${details.targetUrl}`;
      alertColor = details.score && details.score < 70 ? '#f59e0b' : '#10b981';
      content = `
        <p>Your security scan has been completed for <strong>${details.targetUrl}</strong>.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Security Score</p>
          <p style="margin: 10px 0; font-size: 48px; font-weight: bold; color: ${alertColor};">${details.score}/100</p>
          ${details.criticalCount ? `<p style="margin: 5px 0; color: #dc2626;">Critical: ${details.criticalCount}</p>` : ''}
          ${details.highCount ? `<p style="margin: 5px 0; color: #f59e0b;">High: ${details.highCount}</p>` : ''}
        </div>
        <p>View the full report in your dashboard for detailed findings and remediation steps.</p>
      `;
      break;
    case 'vulnerability_found':
      subject = `Security Alert: Vulnerability Detected on ${details.targetUrl}`;
      alertColor = '#dc2626';
      content = `
        <p style="color: #dc2626;"><strong>A security vulnerability has been detected on ${details.targetUrl}.</strong></p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Critical Issues:</strong> ${details.criticalCount || 0}</p>
          <p style="margin: 5px 0 0 0;"><strong>High Severity Issues:</strong> ${details.highCount || 0}</p>
        </div>
        <p>Please review the findings in your dashboard and take immediate action to address these vulnerabilities.</p>
      `;
      break;
    case 'ssl_expiring':
      subject = `SSL Certificate Expiring Soon: ${details.targetUrl}`;
      alertColor = '#f59e0b';
      content = `
        <p style="color: #f59e0b;"><strong>Your SSL certificate is expiring soon!</strong></p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Website:</strong> ${details.targetUrl}</p>
          <p style="margin: 5px 0 0 0;"><strong>Expires:</strong> ${details.expiryDate}</p>
        </div>
        <p>Please renew your SSL certificate before it expires to avoid security warnings and maintain secure connections.</p>
      `;
      break;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Cybersecurity Shield</p>
        </div>

        ${content}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated security alert from Simple Growth Solutions.
        </p>
      </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}
