// Subscription lifecycle emails — the customer-facing moments around money and
// go-live that were previously silent: payment confirmation + welcome, the
// "your site is live" note, a heads-up before the founding rate steps up, and
// failed-payment recovery. All fire automatically from the Square webhook or a
// daily cron, so they reduce support load rather than add to it.

import { emailLayout, escapeHtml, sendEmail } from "./index";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const PLAN_LABELS: Record<string, string> = {
  website_test: "Square Test ($1)",
  website_managed: "Managed",
  website_pro: "Managed Pro",
  website_premium: "Managed Premium",
  website_managed_annual: "Managed (Annual)",
  website_pro_annual: "Managed Pro (Annual)",
  website_premium_annual: "Managed Premium (Annual)",
};

export function planLabel(plan: string): string {
  return PLAN_LABELS[plan] || "your plan";
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function button(href: string, text: string): string {
  return `<div style="text-align: center; margin: 30px 0;">
    <a href="${escapeHtml(href)}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #4f46e5); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">${escapeHtml(text)}</a>
  </div>`;
}

const firstName = (name: string) => escapeHtml((name || "there").split(" ")[0]);

// ============================================================
// 1. Payment confirmation + welcome (+ site live)
// ============================================================

export interface FoundingTerms {
  introCents: number;
  introMonths: number;
  standardCents: number;
}

export async function sendSubscriptionActivatedEmail(args: {
  email: string;
  name: string;
  plan: string;
  founding: FoundingTerms | null;
  liveUrl?: string | null;
}) {
  const label = planLabel(args.plan);

  const foundingBlock = args.founding
    ? `<div style="background: #f5f3ff; border: 1px solid #ddd6fe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #6d28d9;">Your founding rate is locked in 🔒</p>
        <p style="margin: 0; color: #4b5563;">
          ${dollars(args.founding.introCents)}/mo for your first ${args.founding.introMonths} month${args.founding.introMonths === 1 ? "" : "s"},
          then ${dollars(args.founding.standardCents)}/mo. That's
          <strong>${dollars(args.founding.standardCents - args.founding.introCents)}/mo off</strong> the standard rate while you're a founding member.
        </p>
      </div>`
    : "";

  const liveBlock = args.liveUrl
    ? `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #047857;">Your site is live 🎉</p>
        <p style="margin: 0;"><a href="${escapeHtml(args.liveUrl)}" style="color: #2563eb; font-weight: 600; word-break: break-all;">${escapeHtml(args.liveUrl)}</a></p>
      </div>`
    : `<p>We're putting the finishing touches on your site — you'll get one more email the moment it goes live at your real address.</p>`;

  const html = emailLayout(
    `
    <h2 style="color: #1f2937;">You're in, ${firstName(args.name)} 🎉</h2>
    <p>Your payment went through and your <strong>${escapeHtml(label)}</strong> plan is now active. Welcome aboard.</p>
    ${foundingBlock}
    ${liveBlock}
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>What happens now</strong></p>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li>We host, secure, and keep your site online — nothing for you to manage.</li>
        <li>Need an edit? Submit a change request from your portal and we handle it.</li>
        <li>Track everything — requests, billing, your site — in one place.</li>
      </ul>
    </div>
    ${button(`${APP_URL}/portal`, "Go to My Portal")}
    <p>Questions about anything? Just reply to this email — a real person reads it.</p>
    <p>Glad to have you,<br>The Simple Growth Solutions Team</p>
  `,
    "Website Management"
  );

  return sendEmail({
    to: args.email,
    subject: `You're in — welcome to ${label}`,
    html,
  });
}

// ============================================================
// 2. Founding rate stepping up to standard (heads-up)
// ============================================================

export async function sendFoundingStepUpEmail(args: {
  email: string;
  name: string;
  plan: string;
  standardCents: number;
  stepUpDateText: string;
}) {
  const label = planLabel(args.plan);
  const html = emailLayout(
    `
    <h2 style="color: #1f2937;">A quick heads-up on your rate</h2>
    <p>Hi ${firstName(args.name)},</p>
    <p>Your founding rate has been a great deal — and we never want a surprise to show up on your card, so here's your friendly heads-up:</p>
    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #4b5563;">
        Starting <strong>${escapeHtml(args.stepUpDateText)}</strong>, your <strong>${escapeHtml(label)}</strong> plan moves to the standard
        <strong>${dollars(args.standardCents)}/mo</strong>. Everything about your service stays exactly the same.
      </p>
    </div>
    <p>There's nothing you need to do — your site keeps running without interruption. If you have any questions about your plan, just reply and we'll sort it out.</p>
    ${button(`${APP_URL}/portal/billing`, "View My Billing")}
    <p>Thanks for being a founding member,<br>The Simple Growth Solutions Team</p>
  `,
    "Website Management"
  );

  return sendEmail({
    to: args.email,
    subject: "Heads-up: your founding rate ends soon",
    html,
  });
}

// ============================================================
// 3. Failed recurring payment (dunning / recovery)
// ============================================================

// ============================================================
// 4. Internal: new paying customer → Snak Group ops inbox
// ============================================================

// Where internal "new customer" alerts land. Defaults to the Snak Group team
// inbox; override per-environment with INTERNAL_NOTIFY_EMAIL.
const INTERNAL_NOTIFY_EMAIL =
  process.env.INTERNAL_NOTIFY_EMAIL || "snakgroupteam@snakgroup.biz";

export async function sendNewPaidCustomerInternalEmail(args: {
  plan: string;
  priceCents: number;
  founding: boolean;
  customerName: string;
  customerEmail: string;
  organizationName?: string | null;
  liveUrl?: string | null;
}) {
  const label = planLabel(args.plan);
  const row = (k: string, v: string, strong = false) =>
    `<tr>
      <td style="padding: 6px 0; color: #6b7280;">${escapeHtml(k)}</td>
      <td style="padding: 6px 0; text-align: right; ${strong ? "font-weight: bold; color: #047857;" : "color: #111827;"}">${escapeHtml(v)}</td>
    </tr>`;

  const html = emailLayout(
    `
    <h2 style="color: #047857;">New paying customer 🎉</h2>
    <p>A Simple Growth customer just completed their first payment — their subscription is now active.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Customer", args.customerName)}
        ${row("Email", args.customerEmail)}
        ${args.organizationName ? row("Business", args.organizationName) : ""}
        ${row("Plan", `${label}${args.founding ? " (founding rate)" : ""}`)}
        ${row("First payment", dollars(args.priceCents), true)}
        ${args.liveUrl ? row("Live site", args.liveUrl) : ""}
      </table>
    </div>
    ${button(`${APP_URL}/admin`, "Open Admin Dashboard")}
    <p style="color: #6b7280; font-size: 13px;">Internal notification — Simple Growth Solutions.</p>
  `,
    "New Customer"
  );

  return sendEmail({
    to: INTERNAL_NOTIFY_EMAIL,
    subject: `💰 New Simple Growth customer: ${args.customerName} — ${label}`,
    html,
  });
}

// ============================================================
// 4a. Internal: payment captured but subscription NOT provisioned (LOUD FAIL)
// ============================================================

// The anti-silent-failure backstop. If a customer's first payment lands but we
// can't turn it into an active subscription (card couldn't be stored, plan
// variation missing, Square API error), the money moved with nothing to show
// for it. That must NEVER be silent — this alert fires so a human can recover
// the customer instead of them sitting in limbo behind a "success" page.
export async function sendProvisioningStuckInternalEmail(args: {
  reason: string;
  plan: string;
  amountCents: number;
  paymentId: string;
  customerEmail?: string | null;
  organizationName?: string | null;
}) {
  const label = planLabel(args.plan);
  const row = (k: string, v: string) =>
    `<tr>
      <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">${escapeHtml(k)}</td>
      <td style="padding: 6px 0; text-align: right; color: #111827;">${escapeHtml(v)}</td>
    </tr>`;

  const html = emailLayout(
    `
    <h2 style="color: #b91c1c;">⚠️ Payment captured — subscription NOT provisioned</h2>
    <p>A customer's first payment went through, but we could <strong>not</strong> activate
    their recurring subscription. They have paid and are sitting behind a success page with
    nothing active. Recover this manually before they notice.</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Reason", args.reason)}
        ${row("Plan", label)}
        ${row("Amount paid", dollars(args.amountCents))}
        ${row("Square payment", args.paymentId)}
        ${args.customerEmail ? row("Customer", args.customerEmail) : ""}
        ${args.organizationName ? row("Business", args.organizationName) : ""}
      </table>
    </div>
    <p style="color: #4b5563;">Next step: confirm the payment in Square, store the card on file
    if needed, and provision or refund. The subscription row is still <code>awaiting_payment</code>.</p>
    ${button(`${APP_URL}/admin`, "Open Admin Dashboard")}
    <p style="color: #6b7280; font-size: 13px;">Internal alert — Simple Growth Solutions billing.</p>
  `,
    "Billing Alert"
  );

  return sendEmail({
    to: INTERNAL_NOTIFY_EMAIL,
    subject: `⚠️ Payment captured but NOT provisioned — ${label} (${dollars(args.amountCents)})`,
    html,
  });
}

// ============================================================
// 4b. Internal: new lead / consultation request → Snak Group ops inbox
// ============================================================

// Fires synchronously the moment someone submits the landing-page
// questionnaire or the URL-analyzer quick capture. This is the sales alert —
// it does NOT depend on the nurture cron (which mails the lead, not us).
export async function sendNewLeadInternalEmail(args: {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  hasWebsite: boolean;
  websiteUrl?: string | null;
  industry?: string | null;
  challenges?: string | null;
  source: "questionnaire" | "url-analyzer";
}) {
  const row = (k: string, v: string) =>
    `<tr>
      <td style="padding: 6px 0; color: #6b7280; vertical-align: top;">${escapeHtml(k)}</td>
      <td style="padding: 6px 0; text-align: right; color: #111827;">${escapeHtml(v)}</td>
    </tr>`;

  const sourceLabel =
    args.source === "url-analyzer" ? "Website Analyzer" : "Consultation form";

  const html = emailLayout(
    `
    <h2 style="color: #2563eb;">New lead 🌱</h2>
    <p>Someone just submitted a request through the Simple Growth website (<strong>${escapeHtml(sourceLabel)}</strong>). Reach out while it's hot.</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Name", args.contactName)}
        ${row("Business", args.businessName)}
        ${row("Email", args.email)}
        ${args.phone ? row("Phone", args.phone) : ""}
        ${row("Has a website?", args.hasWebsite ? "Yes" : "No")}
        ${args.websiteUrl ? row("Current site", args.websiteUrl) : ""}
        ${args.industry ? row("Industry", args.industry) : ""}
      </table>
    </div>
    ${
      args.challenges
        ? `<p style="margin: 0 0 6px 0; font-weight: 600; color: #374151;">What they said:</p>
           <p style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #e5e7eb; color: #374151;">${escapeHtml(args.challenges)}</p>`
        : ""
    }
    ${button(`${APP_URL}/admin/leads`, "View in Admin")}
    <p style="color: #6b7280; font-size: 13px;">Internal notification — Simple Growth Solutions.</p>
  `,
    "New Lead"
  );

  return sendEmail({
    to: INTERNAL_NOTIFY_EMAIL,
    replyTo: args.email,
    subject: `🌱 New lead: ${args.contactName} — ${args.businessName}`,
    html,
  });
}

// ============================================================
// 5. Failed recurring payment (dunning / recovery)
// ============================================================

export async function sendPaymentFailedEmail(args: {
  email: string;
  name: string;
  plan: string;
}) {
  const label = planLabel(args.plan);
  const html = emailLayout(
    `
    <h2 style="color: #b91c1c;">We couldn't process your payment</h2>
    <p>Hi ${firstName(args.name)},</p>
    <p>We tried to bill your <strong>${escapeHtml(label)}</strong> plan, but the payment didn't go through — usually that's just an expired or replaced card.</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #4b5563;">To keep your site online and avoid any interruption, please update your payment method.</p>
    </div>
    ${button(`${APP_URL}/portal/billing`, "Update Payment Method")}
    <p>We'll try again automatically over the next few days. If you think this is a mistake or need a hand, just reply to this email.</p>
    <p>Thanks,<br>The Simple Growth Solutions Team</p>
  `,
    "Website Management"
  );

  return sendEmail({
    to: args.email,
    subject: "Action needed: your payment didn't go through",
    html,
  });
}
