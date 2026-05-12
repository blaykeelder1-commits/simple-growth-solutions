import { sendEmail, emailLayout, escapeHtml } from "./index";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendCybersecurityUpsell(email: string, name: string, websiteName: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">Your Website is Live — Let&apos;s Protect It</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your website <strong>${escapeHtml(websiteName)}</strong> has been running smoothly for over a month now. Great news!</p>
    <p>But did you know that <strong>43% of cyberattacks target small businesses?</strong> Most don&apos;t have proper security monitoring in place.</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #991B1B;">What we monitor:</p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #7f1d1d;">
        <li>SSL certificate health & expiration</li>
        <li>Security header configuration</li>
        <li>Email security (SPF, DMARC, DKIM)</li>
        <li>Uptime & response time</li>
        <li>Vulnerability detection</li>
      </ul>
    </div>
    <p>Add Cybersecurity monitoring to your managed website — we&apos;ll run monthly scans and alert you to any issues before they become problems.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/portal/billing?plan=cybersecurity" style="display: inline-block; background: linear-gradient(to right, #dc2626, #b91c1c); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">Add Security Monitoring</a>
    </div>
  `, "Cybersecurity Shield");

  return sendEmail({
    to: email,
    subject: `Protect ${websiteName} — Add Security Monitoring`,
    html,
  });
}

export async function sendCashFlowUpsell(email: string, name: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">Get Paid Faster with Cash Flow AI</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>You&apos;re already getting great value from Simple Growth Solutions. Now it&apos;s time to tackle the #1 killer of small businesses: <strong>cash flow problems.</strong></p>
    <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #065f46;">Start free. Upgrade when you see value.</p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #064e3b;">
        <li><strong>Free:</strong> Dashboard, invoice tracking, health score</li>
        <li><strong>AR Agent (8%):</strong> Automated follow-ups — we only get paid when you get paid</li>
        <li><strong>Pro ($79/mo):</strong> Full forecasting, benchmarks, AI recommendations</li>
      </ul>
    </div>
    <p>Most businesses recover <strong>$15,000-50,000</strong> in their first quarter. And with our 8% success fee model, there&apos;s zero risk to try.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/cashflow" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);">Start Free Dashboard</a>
    </div>
  `, "Cash Flow AI");

  return sendEmail({
    to: email,
    subject: "Get Paid Faster — Cash Flow AI is Free to Start",
    html,
  });
}

export async function sendChauffeurUpsell(email: string, name: string) {
  const html = emailLayout(`
    <h2 style="color: #1f2937;">See Your Entire Business in One Dashboard</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>You&apos;ve been using Cash Flow AI to manage your invoices and get paid faster. But what if you could see <strong>everything</strong> about your business in one place?</p>
    <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: 600; color: #5b21b6;">Business Chauffeur connects to:</p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4c1d95;">
        <li>QuickBooks, Xero, or FreshBooks</li>
        <li>Bank accounts via Plaid</li>
        <li>POS systems (Square, Clover, Toast)</li>
        <li>Google Business Profile & reviews</li>
      </ul>
    </div>
    <p>Get AI-powered insights on revenue trends, expense patterns, employee performance, and competitive opportunities — all tailored to your industry.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/chauffeur" style="display: inline-block; background: linear-gradient(to right, #7c3aed, #6d28d9); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">Explore Business Chauffeur</a>
    </div>
  `, "Business Chauffeur");

  return sendEmail({
    to: email,
    subject: "See Your Entire Business in One Dashboard",
    html,
  });
}
