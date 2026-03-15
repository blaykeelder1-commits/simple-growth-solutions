import { emailLayout, escapeHtml } from '@/lib/email';

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface UnsubscribeParams {
  leadId: string;
  token: string;
}

function unsubscribeFooter({ leadId, token }: UnsubscribeParams): string {
  const url = `${APP_URL}/api/leads/unsubscribe?id=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`;
  return `
    <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 20px;">
      Don't want to receive these emails? <a href="${escapeHtml(url)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
    </p>
  `;
}

function ctaButton(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(href)}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">${escapeHtml(text)}</a>
    </div>
  `;
}

// Day 0: Welcome + Analysis Summary
export function getNurtureWelcomeEmail(data: {
  name: string;
  businessName: string;
  hasWebsite: boolean;
  websiteUrl?: string;
  leadId: string;
  token: string;
}): { subject: string; html: string } {
  const websiteTeaser = data.hasWebsite && data.websiteUrl
    ? `
      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-weight: 600; color: #1e40af;">We took a look at ${escapeHtml(data.websiteUrl)}</p>
        <p style="margin: 8px 0 0 0; color: #374151;">We've identified several opportunities to improve your online presence. Schedule a free consultation to get the full breakdown and actionable recommendations.</p>
      </div>
    `
    : '';

  const content = `
    <h2 style="color: #1f2937;">Welcome, ${escapeHtml(data.name)}!</h2>
    <p>Thanks for your interest in Simple Growth Solutions. We help small businesses like ${escapeHtml(data.businessName)} grow through:</p>
    <ul style="padding-left: 20px; color: #374151;">
      <li><strong>Professional Websites</strong> &mdash; designed and managed for you, starting free</li>
      <li><strong>Cash Flow AI</strong> &mdash; intelligent invoice tracking that gets you paid faster</li>
      <li><strong>Cybersecurity Shield</strong> &mdash; protect your business online</li>
      <li><strong>Business Intelligence</strong> &mdash; AI-powered insights to guide your decisions</li>
    </ul>
    ${websiteTeaser}
    <p>We'd love to learn more about your goals and show you how we can help.</p>
    ${ctaButton('Schedule a Free Consultation', `${APP_URL}/contact`)}
    <p>Or, if you're ready to dive in:</p>
    ${ctaButton('Get Started Free', `${APP_URL}/get-started`)}
    <p style="color: #6b7280;">Best regards,<br>The Simple Growth Solutions Team</p>
    ${unsubscribeFooter({ leadId: data.leadId, token: data.token })}
  `;

  return {
    subject: `Welcome ${data.name} — here's your growth roadmap`,
    html: emailLayout(content, 'Your Growth Journey Starts Here'),
  };
}

// Day 2: Case Study / Social Proof
export function getNurtureCaseStudyEmail(data: {
  name: string;
  industry?: string;
  leadId: string;
  token: string;
}): { subject: string; html: string } {
  const industryMention = data.industry
    ? ` in the ${escapeHtml(data.industry)} space`
    : '';

  const content = `
    <h2 style="color: #1f2937;">Real Results for Real Businesses</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>We wanted to share how businesses${industryMention} are using Simple Growth Solutions to drive real growth.</p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <p style="font-style: italic; color: #374151; margin: 0 0 15px 0;">"Before SGS, our website was barely functional and we were losing invoices left and right. Within a month, we had a professional site bringing in leads and our cash flow improved by 40%."</p>
      <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Sarah M.</strong> &mdash; Small Business Owner</p>
    </div>

    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #166534; margin: 0 0 10px 0;">By the Numbers</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #374151;"><strong>Average website score improvement:</strong></td>
          <td style="padding: 6px 0; text-align: right; color: #166534; font-weight: bold;">+35 points</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #374151;"><strong>Invoices recovered with Cash Flow AI:</strong></td>
          <td style="padding: 6px 0; text-align: right; color: #166534; font-weight: bold;">89%</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #374151;"><strong>Average time to launch a new site:</strong></td>
          <td style="padding: 6px 0; text-align: right; color: #166534; font-weight: bold;">5 days</td>
        </tr>
      </table>
    </div>

    <p>And here's the best part: <strong>your first website is completely free</strong>. No catch, no credit card required. We build it, you own it.</p>
    ${ctaButton('Claim Your Free Website', `${APP_URL}/get-started`)}
    <p style="color: #6b7280;">Best regards,<br>The Simple Growth Solutions Team</p>
    ${unsubscribeFooter({ leadId: data.leadId, token: data.token })}
  `;

  return {
    subject: 'How businesses like yours are growing with us',
    html: emailLayout(content, 'Success Stories'),
  };
}

// Day 5: Free Website Offer
export function getNurtureFreeOfferEmail(data: {
  name: string;
  businessName: string;
  leadId: string;
  token: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="color: #1f2937;">Your Free Website Is Ready to Build</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>We've reserved a spot for ${escapeHtml(data.businessName)} in our free website program. Here's what you'll get at no cost:</p>

    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
            <strong style="margin-left: 8px;">Professional Design</strong>
            <p style="margin: 4px 0 0 26px; color: #6b7280; font-size: 14px;">Custom-designed to match your brand</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
            <strong style="margin-left: 8px;">Mobile Responsive</strong>
            <p style="margin: 4px 0 0 26px; color: #6b7280; font-size: 14px;">Looks great on every device</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
            <strong style="margin-left: 8px;">SEO Optimized</strong>
            <p style="margin: 4px 0 0 26px; color: #6b7280; font-size: 14px;">Built to rank in search results</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <span style="color: #10b981; font-weight: bold; font-size: 18px;">&#10003;</span>
            <strong style="margin-left: 8px;">No Commitment</strong>
            <p style="margin: 4px 0 0 26px; color: #6b7280; font-size: 14px;">Free forever on our starter plan</p>
          </td>
        </tr>
      </table>
    </div>

    <p>All we need is a few minutes of your time to answer our quick questionnaire, and our team takes it from there.</p>
    ${ctaButton('Start Your Free Website', `${APP_URL}/get-started`)}
    <p style="color: #6b7280; font-size: 14px;">No credit card. No obligations. Just a better website for ${escapeHtml(data.businessName)}.</p>
    <p style="color: #6b7280;">Best regards,<br>The Simple Growth Solutions Team</p>
    ${unsubscribeFooter({ leadId: data.leadId, token: data.token })}
  `;

  return {
    subject: `${data.name}, your free website is ready to build`,
    html: emailLayout(content, 'Free Website Program'),
  };
}

// Day 10: Last Chance / Urgency
export function getNurtureLastChanceEmail(data: {
  name: string;
  leadId: string;
  token: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="color: #1f2937;">Don't Miss Out, ${escapeHtml(data.name)}</h2>
    <p>Hi ${escapeHtml(data.name)},</p>
    <p>This is our last reminder about your free website offer. We only have a limited number of spots each month, and we'd hate for you to miss yours.</p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 600; color: #92400e;">Limited Availability</p>
      <p style="margin: 8px 0 0 0; color: #78350f;">We take on a limited number of free website projects each month to ensure quality. Claim your spot before it's gone.</p>
    </div>

    <p>Here's a quick recap of what you'll get:</p>
    <ul style="padding-left: 20px; color: #374151;">
      <li>A professionally designed, mobile-friendly website</li>
      <li>SEO setup so customers can find you</li>
      <li>Ongoing management &mdash; we handle the tech</li>
      <li>Zero cost on our starter plan, forever</li>
    </ul>

    ${ctaButton('Claim Your Free Website Now', `${APP_URL}/get-started`)}

    <p style="color: #6b7280;">If you've decided this isn't for you, no worries at all. We won't send any more follow-ups after this. We wish you the best!</p>
    <p style="color: #6b7280;">Best regards,<br>The Simple Growth Solutions Team</p>
    ${unsubscribeFooter({ leadId: data.leadId, token: data.token })}
  `;

  return {
    subject: `Last chance: claim your free website, ${data.name}`,
    html: emailLayout(content, 'Final Reminder'),
  };
}
