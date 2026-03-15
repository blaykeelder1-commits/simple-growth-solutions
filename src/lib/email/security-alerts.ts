// Security Alert Emails
// Professional HTML emails for security scan reports and SSL expiry warnings

import { sendEmail } from "./index";

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailLayout(content: string, subtitle?: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px;">Simple Growth Solutions</h1>
        ${subtitle ? `<p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">${subtitle}</p>` : ""}
      </div>
      ${content}
    </div>
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
      This is an automated security report from Simple Growth Solutions.
    </p>
  </body>
</html>`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Secure";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "At Risk";
  return "Critical";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#f59e0b";
    case "low": return "#3b82f6";
    default: return "#6b7280";
  }
}

function getSeverityBg(severity: string): string {
  switch (severity) {
    case "critical": return "#fef2f2";
    case "high": return "#fff7ed";
    case "medium": return "#fffbeb";
    case "low": return "#eff6ff";
    default: return "#f9fafb";
  }
}

export interface ScanReportData {
  url: string;
  score: number;
  previousScore: number | null;
  vulnerabilities: Array<{ title: string; severity: string; remediation: string }>;
  sslExpiresIn: number | null;
}

/**
 * Send a comprehensive security scan report email.
 */
export async function sendSecurityScanReport(to: string, data: ScanReportData) {
  const scoreColor = getScoreColor(data.score);
  const scoreLabel = getScoreLabel(data.score);

  // Score change indicator
  let scoreChange = "";
  if (data.previousScore !== null) {
    const diff = data.score - data.previousScore;
    if (diff > 0) {
      scoreChange = `<span style="color: #10b981; font-size: 14px; font-weight: 600;">+${diff} from last scan</span>`;
    } else if (diff < 0) {
      scoreChange = `<span style="color: #ef4444; font-size: 14px; font-weight: 600;">${diff} from last scan</span>`;
    } else {
      scoreChange = `<span style="color: #6b7280; font-size: 14px;">No change from last scan</span>`;
    }
  }

  // Build vulnerability list
  let vulnHtml = "";
  if (data.vulnerabilities.length > 0) {
    const vulnItems = data.vulnerabilities
      .map(
        (v) => `
      <div style="background: ${getSeverityBg(v.severity)}; border-left: 4px solid ${getSeverityColor(v.severity)}; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span style="background: ${getSeverityColor(v.severity)}; color: white; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${escapeHtml(v.severity)}</span>
          <span style="margin-left: 10px; font-weight: 600; color: #1f2937;">${escapeHtml(v.title)}</span>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">${escapeHtml(v.remediation)}</p>
      </div>`
      )
      .join("");

    vulnHtml = `
      <div style="margin-top: 24px;">
        <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 12px;">Vulnerabilities Found (${data.vulnerabilities.length})</h3>
        ${vulnItems}
      </div>`;
  } else {
    vulnHtml = `
      <div style="margin-top: 24px; text-align: center; padding: 20px; background: #ecfdf5; border-radius: 8px;">
        <p style="margin: 0; color: #10b981; font-weight: 600;">No vulnerabilities found. Great job!</p>
      </div>`;
  }

  // SSL expiry warning
  let sslWarning = "";
  if (data.sslExpiresIn !== null && data.sslExpiresIn <= 30) {
    const urgency = data.sslExpiresIn <= 7 ? "#ef4444" : "#f59e0b";
    sslWarning = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 16px;">
        <p style="margin: 0; color: ${urgency}; font-weight: 600;">SSL Certificate expires in ${data.sslExpiresIn} days</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #92400e;">Renew your certificate to maintain secure connections.</p>
      </div>`;
  }

  const content = `
    <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 4px;">Security Scan Report</h2>
    <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">Results for <strong>${escapeHtml(data.url)}</strong></p>

    <div style="text-align: center; background: #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Security Score</p>
      <div style="display: inline-block; width: 100px; height: 100px; border-radius: 50%; background: white; border: 6px solid ${scoreColor}; line-height: 88px; text-align: center;">
        <span style="font-size: 36px; font-weight: 800; color: ${scoreColor};">${data.score}</span>
      </div>
      <p style="margin: 10px 0 4px 0; font-size: 18px; font-weight: 700; color: ${scoreColor};">${scoreLabel}</p>
      ${scoreChange ? `<p style="margin: 0;">${scoreChange}</p>` : ""}
    </div>

    ${sslWarning}
    ${vulnHtml}

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/security" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">View Full Report</a>
    </div>
  `;

  const html = emailLayout(content, "Cybersecurity Shield");

  return sendEmail({
    to,
    subject: `Security Score: ${data.score}/100 for ${data.url}`,
    html,
  });
}

export interface SSLExpiryWarningData {
  url: string;
  daysUntilExpiry: number;
  expiresAt: Date;
}

/**
 * Send an SSL certificate expiry warning email.
 */
export async function sendSSLExpiryWarning(to: string, data: SSLExpiryWarningData) {
  const urgencyColor = data.daysUntilExpiry <= 7 ? "#ef4444" : "#f59e0b";
  const urgencyBg = data.daysUntilExpiry <= 7 ? "#fef2f2" : "#fffbeb";
  const urgencyLabel = data.daysUntilExpiry <= 7 ? "URGENT" : "WARNING";

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background: ${urgencyColor}; color: white; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">${urgencyLabel}</span>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; text-align: center; margin-bottom: 4px;">SSL Certificate Expiring Soon</h2>
    <p style="color: #6b7280; text-align: center; margin: 0 0 24px 0; font-size: 14px;">${escapeHtml(data.url)}</p>

    <div style="background: ${urgencyBg}; border: 1px solid ${urgencyColor}33; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Expires In</p>
      <p style="margin: 0; font-size: 48px; font-weight: 800; color: ${urgencyColor};">${data.daysUntilExpiry}</p>
      <p style="margin: 4px 0 0 0; font-size: 16px; color: ${urgencyColor}; font-weight: 600;">days</p>
      <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
        Expiry date: <strong>${data.expiresAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
      </p>
    </div>

    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 15px;">What happens if your SSL expires?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
        <li style="margin-bottom: 6px;">Visitors will see security warnings in their browser</li>
        <li style="margin-bottom: 6px;">Search engines may lower your ranking</li>
        <li style="margin-bottom: 6px;">Online transactions will be blocked</li>
        <li style="margin-bottom: 6px;">Customer trust may be impacted</li>
      </ul>
    </div>

    <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 15px;">How to fix this</h3>
      <ol style="margin: 0; padding-left: 20px; color: #047857; font-size: 14px;">
        <li style="margin-bottom: 4px;">Contact your SSL certificate provider or hosting company</li>
        <li style="margin-bottom: 4px;">Renew or reissue your SSL certificate</li>
        <li style="margin-bottom: 4px;">Install the renewed certificate on your server</li>
        <li style="margin-bottom: 4px;">Verify it's working by running another scan</li>
      </ol>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/security" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">View Dashboard</a>
    </div>
  `;

  const html = emailLayout(content, "Cybersecurity Shield");

  return sendEmail({
    to,
    subject: `${urgencyLabel}: SSL Certificate expires in ${data.daysUntilExpiry} days - ${data.url}`,
    html,
  });
}
