import { Resend } from 'resend';
import { prisma } from '@/lib/db/prisma';
import { apiLogger } from '@/lib/logger';

// Initialize Resend client only if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Simple Growth Solutions <noreply@simplegrowthsolutions.com>';

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: EmailOptions) {
  if (!resend) {
    apiLogger.debug({ to, subject }, 'Email skipped (Resend not configured)');
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
      apiLogger.warn({ to, subject, error: error.message }, 'Email send failed');
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, id: data?.id };
  } catch (error) {
    apiLogger.error({ err: error, to, subject }, 'Email send error');
    throw error;
  }
}

// ===========================================
// SHARED EMAIL TEMPLATE WRAPPER
// ===========================================

function emailLayout(content: string, subtitle?: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0;">Simple Growth Solutions</h1>
      ${subtitle ? `<p style="color: #6b7280; margin: 5px 0 0 0;">${subtitle}</p>` : ''}
    </div>
    ${content}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #6b7280; text-align: center;">
      This is an automated email from Simple Growth Solutions.
    </p>
  </body>
</html>`;
}

// ===========================================
// EMAIL TEMPLATES
// ===========================================

export async function sendVerificationEmail(email: string, name: string, verifyUrl: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">Verify Your Email Address</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Verify Email Address</a>
    </div>
    <p>This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; color: #4b5563;">${escapeHtml(verifyUrl)}</p>
  `);

  return sendEmail({ to: email, subject: 'Verify Your Email - Simple Growth Solutions', html });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">Welcome, ${escapeHtml(name || 'there')}!</h2>
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
  `);

  return sendEmail({ to: email, subject: 'Welcome to Simple Growth Solutions!', html });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">Reset Your Password</h2>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    <p>If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">${escapeHtml(resetUrl)}</p>
  `);

  return sendEmail({ to: email, subject: 'Reset Your Password - Simple Growth Solutions', html });
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

  const html = emailLayout(`
    <h2 style="color: ${urgencyColor};">${daysOverdue > 0 ? 'Payment Overdue' : 'Payment Reminder'}</h2>
    <p>Dear ${escapeHtml(clientName)},</p>
    <p>${daysOverdue > 0
      ? `Your invoice is currently ${daysOverdue} days overdue. Please submit payment as soon as possible.`
      : 'This is a friendly reminder about your upcoming payment.'
    }</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Amount Due:</strong></td>
          <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: ${urgencyColor};">${escapeHtml(amount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(dueDate)}</td>
        </tr>
      </table>
    </div>
    <p>If you have already sent your payment, please disregard this notice.</p>
    <p>If you have any questions or need to discuss payment arrangements, please contact us.</p>
    <p>Thank you for your business.</p>
  `);

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
  const alertColor = alertType === 'vulnerability_found' ? '#dc2626' : alertType === 'ssl_expiring' ? '#f59e0b' : (details.score && details.score < 70 ? '#f59e0b' : '#10b981');

  switch (alertType) {
    case 'scan_complete':
      subject = `Security Scan Complete: ${details.targetUrl}`;
      content = `
        <p>Your security scan has been completed for <strong>${escapeHtml(details.targetUrl)}</strong>.</p>
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
      content = `
        <p style="color: #dc2626;"><strong>A security vulnerability has been detected on ${escapeHtml(details.targetUrl)}.</strong></p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Critical Issues:</strong> ${details.criticalCount || 0}</p>
          <p style="margin: 5px 0 0 0;"><strong>High Severity Issues:</strong> ${details.highCount || 0}</p>
        </div>
        <p>Please review the findings in your dashboard and take immediate action to address these vulnerabilities.</p>
      `;
      break;
    case 'ssl_expiring':
      subject = `SSL Certificate Expiring Soon: ${details.targetUrl}`;
      content = `
        <p style="color: #f59e0b;"><strong>Your SSL certificate is expiring soon!</strong></p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Website:</strong> ${escapeHtml(details.targetUrl)}</p>
          <p style="margin: 5px 0 0 0;"><strong>Expires:</strong> ${escapeHtml(details.expiryDate || '')}</p>
        </div>
        <p>Please renew your SSL certificate before it expires to avoid security warnings and maintain secure connections.</p>
      `;
      break;
  }

  const html = emailLayout(content, 'Cybersecurity Shield');
  return sendEmail({ to: email, subject, html });
}

// ===========================================
// PROJECT & CHANGE REQUEST NOTIFICATIONS
// ===========================================

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/** Get all admin user emails for notifications */
export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { email: true },
  });
  return admins.map((a) => a.email).filter(Boolean);
}

/** Notify admins when a customer submits a new website project */
export async function sendNewProjectNotification(
  adminEmails: string[],
  project: { id: string; projectName: string; projectType: string },
  customerName: string
) {
  if (adminEmails.length === 0) return;

  const typeLabel = project.projectType.replace('_', ' ');
  const html = emailLayout(`
    <h2 style="color: #1f2937;">New Project Submitted</h2>
    <p>A new website project has been submitted and needs your review.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Project:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(project.projectName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${escapeHtml(typeLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Submitted by:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(customerName)}</td>
        </tr>
      </table>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/admin/projects/${project.id}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Review Project</a>
    </div>
  `, 'Website Management');

  return sendEmail({
    to: adminEmails,
    subject: `New Project: ${project.projectName}`,
    html,
  });
}

/** Notify a customer when their project status changes */
export async function sendProjectStatusUpdateEmail(
  email: string | string[],
  customerName: string,
  project: { id: string; projectName: string },
  oldStatus: string,
  newStatus: string
) {
  const statusMessages: Record<string, string> = {
    reviewing: 'Our team is now reviewing your project requirements.',
    approved: 'Your project has been approved and will move into development soon.',
    in_progress: 'Development has started on your project!',
    review_ready: 'Your project is ready for your review. Please check it out and let us know if you need any changes.',
    revision: 'We\'re working on the revisions you requested.',
    deployed: 'Your project has been deployed and is now live!',
    completed: 'Your project has been marked as completed. Thank you for choosing Simple Growth Solutions!',
  };

  const statusColors: Record<string, string> = {
    reviewing: '#3b82f6',
    approved: '#10b981',
    in_progress: '#8b5cf6',
    review_ready: '#f59e0b',
    revision: '#f59e0b',
    deployed: '#10b981',
    completed: '#10b981',
  };

  const message = statusMessages[newStatus] || `Your project status has been updated to "${escapeHtml(newStatus.replace('_', ' '))}".`;
  const color = statusColors[newStatus] || '#2563eb';

  const html = emailLayout(`
    <h2 style="color: #1f2937;">Project Update: ${escapeHtml(project.projectName)}</h2>
    <p>Hi ${escapeHtml(customerName)},</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Status</p>
      <p style="margin: 10px 0; font-size: 24px; font-weight: bold; color: ${color}; text-transform: capitalize;">${escapeHtml(newStatus.replace('_', ' '))}</p>
    </div>
    <p>${message}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/portal/projects/${project.id}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Project</a>
    </div>
  `, 'Website Management');

  return sendEmail({
    to: email,
    subject: `Project Update: ${project.projectName} — ${newStatus.replace('_', ' ')}`,
    html,
  });
}

/** Notify admins when a customer submits a change request */
export async function sendNewChangeRequestNotification(
  adminEmails: string[],
  changeRequest: { title: string; type: string; priority: string; description: string },
  project: { id: string; projectName: string },
  customerName: string
) {
  if (adminEmails.length === 0) return;

  const priorityColors: Record<string, string> = {
    low: '#6b7280',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#dc2626',
  };
  const pColor = priorityColors[changeRequest.priority] || '#3b82f6';

  const html = emailLayout(`
    <h2 style="color: #1f2937;">New Change Request</h2>
    <p>A new change request has been submitted for <strong>${escapeHtml(project.projectName)}</strong>.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Title:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(changeRequest.title)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Type:</strong></td>
          <td style="padding: 8px 0; text-align: right; text-transform: capitalize;">${escapeHtml(changeRequest.type)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Priority:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: ${pColor}; font-weight: bold; text-transform: uppercase;">${escapeHtml(changeRequest.priority)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Submitted by:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(customerName)}</td>
        </tr>
      </table>
    </div>
    <p style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #e5e7eb; color: #374151;">${escapeHtml(changeRequest.description)}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/admin/projects/${project.id}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Request</a>
    </div>
  `, 'Website Management');

  return sendEmail({
    to: adminEmails,
    subject: `Change Request [${changeRequest.priority.toUpperCase()}]: ${changeRequest.title}`,
    html,
  });
}

/** Notify a customer when their change request status is updated */
export async function sendChangeRequestUpdateEmail(
  email: string | string[],
  customerName: string,
  changeRequest: { title: string; status: string; resolution?: string | null },
  project: { id: string; projectName: string }
) {
  const statusMessages: Record<string, string> = {
    approved: 'Your change request has been approved and will be worked on.',
    in_progress: 'Work has started on your change request.',
    completed: 'Your change request has been completed!',
    rejected: 'Your change request was not approved. See details below.',
  };

  const statusColors: Record<string, string> = {
    approved: '#10b981',
    in_progress: '#8b5cf6',
    completed: '#10b981',
    rejected: '#dc2626',
  };

  const message = statusMessages[changeRequest.status] || `Your change request status has been updated to "${escapeHtml(changeRequest.status)}".`;
  const color = statusColors[changeRequest.status] || '#2563eb';

  const html = emailLayout(`
    <h2 style="color: #1f2937;">Change Request Update</h2>
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>Your change request for <strong>${escapeHtml(project.projectName)}</strong> has been updated:</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0;"><strong>Request:</strong></td>
          <td style="padding: 8px 0; text-align: right;">${escapeHtml(changeRequest.title)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Status:</strong></td>
          <td style="padding: 8px 0; text-align: right; color: ${color}; font-weight: bold; text-transform: capitalize;">${escapeHtml(changeRequest.status.replace('_', ' '))}</td>
        </tr>
      </table>
    </div>
    ${changeRequest.resolution ? `
    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid ${color}; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #374151;">Resolution:</p>
      <p style="margin: 8px 0 0 0; color: #4b5563;">${escapeHtml(changeRequest.resolution)}</p>
    </div>` : ''}
    <p>${message}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/portal/projects/${project.id}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Project</a>
    </div>
  `, 'Website Management');

  return sendEmail({
    to: email,
    subject: `Change Request ${changeRequest.status === 'completed' ? 'Completed' : 'Updated'}: ${changeRequest.title}`,
    html,
  });
}

/** Notify a customer when an admin adds a client-visible note to their project */
export async function sendProjectNoteEmail(
  email: string | string[],
  customerName: string,
  project: { id: string; projectName: string },
  noteContent: string
) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">New Message on ${escapeHtml(project.projectName)}</h2>
    <p>Hi ${escapeHtml(customerName)},</p>
    <p>A new note has been added to your project:</p>
    <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <p style="margin: 0; color: #374151;">${escapeHtml(noteContent)}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/portal/projects/${project.id}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">View Project</a>
    </div>
  `, 'Website Management');

  return sendEmail({
    to: email,
    subject: `New Message: ${project.projectName}`,
    html,
  });
}
