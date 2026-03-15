import { sendEmail } from './index';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function trialEmailLayout(content: string, subtitle?: string): string {
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

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  cashflow_ai: 'Cash Flow AI',
  chauffeur: 'Business Chauffeur',
  cybersecurity: 'Cybersecurity Shield',
  website_managed: 'Managed Website',
  website_pro: 'Managed Pro',
  website_premium: 'Managed Premium',
  ar_proactive: 'Proactive AR',
  geo_starter: 'GEO Starter',
  geo_pro: 'GEO Pro',
  geo_enterprise: 'GEO Enterprise',
  starter_bundle: 'Starter Bundle',
  growth_bundle: 'Growth Bundle',
  full_suite: 'Full Suite',
  enterprise_suite: 'Enterprise Suite',
};

function getPlanDisplayName(plan: string): string {
  return PLAN_DISPLAY_NAMES[plan] || plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PLAN_FEATURES: Record<string, string[]> = {
  cashflow_ai: [
    'Invoice recovery automation',
    'Cash flow dashboard & prediction',
    'AI-powered recovery strategies',
    'Client payment scoring',
  ],
  chauffeur: [
    'AI-powered business insights',
    'POS & accounting integrations',
    'Review monitoring & analytics',
    'Unified business intelligence',
  ],
  cybersecurity: [
    'Automated security scanning',
    'Vulnerability detection & alerts',
    'SSL certificate monitoring',
    'Email security (SPF/DKIM/DMARC)',
  ],
};

function getFeaturesList(plan: string): string {
  const features = PLAN_FEATURES[plan];
  if (!features) return '';
  return features
    .map((f) => `<li style="padding: 4px 0; color: #374151;">${escapeHtml(f)}</li>`)
    .join('');
}

// ===========================================
// TRIAL EXPIRATION EMAIL TEMPLATES
// ===========================================

interface TrialEmailData {
  name: string;
  planName: string;
  upgradeUrl: string;
  daysLeft?: number;
}

/** 7 days before trial ends */
export async function sendTrialExpiringEmail(
  to: string,
  data: TrialEmailData & { daysLeft: number }
) {
  const displayName = getPlanDisplayName(data.planName);
  const safeName = escapeHtml(data.name || 'there');
  const safeUpgradeUrl = escapeHtml(data.upgradeUrl);

  const html = trialEmailLayout(`
    <h2 style="color: #1f2937;">Your ${escapeHtml(displayName)} trial ends in ${data.daysLeft} days</h2>
    <p>Hi ${safeName},</p>
    <p>Just a heads-up: your free trial of <strong>${escapeHtml(displayName)}</strong> will end in <strong>${data.daysLeft} days</strong>.</p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #1f2937;">Features you'll lose access to:</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${getFeaturesList(data.planName) || '<li style="padding: 4px 0; color: #374151;">All premium features for this plan</li>'}
      </ul>
    </div>

    <p>Upgrade now to keep your features and ensure uninterrupted service.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeUpgradeUrl}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Upgrade Now</a>
    </div>

    <p style="font-size: 14px; color: #6b7280;">If you have any questions about our plans, reply to this email or visit our <a href="${APP_URL}/pricing" style="color: #2563eb;">pricing page</a>.</p>
  `, 'Trial Reminder');

  return sendEmail({
    to,
    subject: `Your ${displayName} trial ends in ${data.daysLeft} days`,
    html,
  });
}

/** 3 days before trial ends */
export async function sendTrialUrgentEmail(
  to: string,
  data: TrialEmailData
) {
  const displayName = getPlanDisplayName(data.planName);
  const safeName = escapeHtml(data.name || 'there');
  const safeUpgradeUrl = escapeHtml(data.upgradeUrl);

  const html = trialEmailLayout(`
    <h2 style="color: #f59e0b;">Only 3 days left on your ${escapeHtml(displayName)} trial</h2>
    <p>Hi ${safeName},</p>
    <p>Your <strong>${escapeHtml(displayName)}</strong> trial is ending soon. In just 3 days, you'll lose access to all the premium features you've been using.</p>

    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Don't let your progress go to waste</p>
      <p style="margin: 8px 0 0 0; color: #78350f;">Upgrade today to keep everything running smoothly. Your data and settings will be preserved.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeUpgradeUrl}" style="display: inline-block; background: linear-gradient(to right, #f59e0b, #d97706); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">Upgrade Before It's Too Late</a>
    </div>

    <p style="text-align: center;">
      <a href="${APP_URL}/pricing" style="color: #6b7280; font-size: 14px;">View all plans and pricing</a>
    </p>
  `, 'Trial Ending Soon');

  return sendEmail({
    to,
    subject: `3 days left on your ${displayName} trial`,
    html,
  });
}

/** 1 day before trial ends */
export async function sendTrialFinalEmail(
  to: string,
  data: TrialEmailData
) {
  const displayName = getPlanDisplayName(data.planName);
  const safeName = escapeHtml(data.name || 'there');
  const safeUpgradeUrl = escapeHtml(data.upgradeUrl);

  const html = trialEmailLayout(`
    <h2 style="color: #dc2626;">Last day: your ${escapeHtml(displayName)} trial ends tomorrow</h2>
    <p>Hi ${safeName},</p>
    <p>This is your final reminder. Your <strong>${escapeHtml(displayName)}</strong> trial expires <strong>tomorrow</strong>.</p>

    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">After tomorrow, you will:</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #991b1b;">
        <li>Lose access to all ${escapeHtml(displayName)} features</li>
        <li>No longer receive automated alerts or insights</li>
        <li>Need to upgrade to regain access</li>
      </ul>
    </div>

    <p>The good news? Your data will be saved. Upgrade now and pick up right where you left off.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeUpgradeUrl}" style="display: inline-block; background: linear-gradient(to right, #dc2626, #b91c1c); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">Upgrade Now — Last Chance</a>
    </div>

    <p style="text-align: center;">
      <a href="${APP_URL}/pricing" style="color: #6b7280; font-size: 14px;">Compare plans</a>
    </p>
  `, 'Trial Expiring Tomorrow');

  return sendEmail({
    to,
    subject: `Last day: your ${displayName} trial ends tomorrow`,
    html,
  });
}

/** Trial has expired */
export async function sendTrialExpiredEmail(
  to: string,
  data: TrialEmailData
) {
  const displayName = getPlanDisplayName(data.planName);
  const safeName = escapeHtml(data.name || 'there');
  const safeUpgradeUrl = escapeHtml(data.upgradeUrl);

  const html = trialEmailLayout(`
    <h2 style="color: #6b7280;">Your ${escapeHtml(displayName)} trial has ended</h2>
    <p>Hi ${safeName},</p>
    <p>Your free trial of <strong>${escapeHtml(displayName)}</strong> has ended. Your account has been moved to the free tier.</p>

    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Your data is safe</p>
      <p style="margin: 8px 0 0 0; color: #374151;">Everything you set up during your trial is still here. Upgrade anytime to restore full access.</p>
    </div>

    <p>We'd love to have you back. If you need more time to decide, or have questions about which plan is right for you, just reply to this email.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeUpgradeUrl}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">Reactivate Your Plan</a>
    </div>

    <p style="text-align: center;">
      <a href="${APP_URL}/pricing" style="color: #6b7280; font-size: 14px;">View pricing options</a>
    </p>
  `, 'Trial Ended');

  return sendEmail({
    to,
    subject: `Your ${displayName} trial has ended`,
    html,
  });
}
