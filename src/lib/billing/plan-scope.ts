/**
 * What each plan INCLUDES — the one source of truth for what we may promise a customer.
 *
 * Mirrors the public pricing page (src/app/pricing/page.tsx — keep the two in step) and
 * Blayke's standing rule (2026-09-29): every plan covers the website, the Google Business Profile and SEO; social
 * media, ads and the customer's other accounts are NOT part of any plan. When a customer asks
 * for something outside their plan we don't do it for free and we don't flatly refuse — we
 * offer the upgrade (or a one-time add-on quote) and let Blayke decide the rest.
 *
 * Every customer-facing draft and every review is given the customer's scope from here, and
 * SGS refuses customer text that promises out-of-plan work (see src/lib/review).
 */

export type PlanKey = "website_managed" | "website_pro" | "website_premium";

interface PlanScope {
  label: string;
  price: string; // per month
  includes: string[];
  upgradeTo: PlanKey | null;
}

// Every plan includes these (listed on the pricing page's Managed tier since 2026-09-30).
const ALL_PLANS = [
  "Managed hosting, SSL and security monitoring for their website",
  "Website edits through change requests (their monthly allowance, below)",
  "On-site SEO: page titles, descriptions, headings, speed, local search basics",
  "Keeping their Google Business Profile accurate: hours, info and photos — changes only with the owner's OK",
];

export const PLAN_SCOPE: Record<PlanKey, PlanScope> = {
  website_managed: {
    label: "Managed",
    price: "$49",
    includes: [
      ...ALL_PLANS,
      "2 change requests per month, 5-business-day turnaround",
      "Extra change requests $25 each; same-day rush $49",
      "Email support",
    ],
    upgradeTo: "website_pro",
  },
  website_pro: {
    label: "Managed Pro",
    price: "$79",
    includes: [
      ...ALL_PLANS,
      "4 change requests per month, 24-hour turnaround on every one",
      "AI chatbot integration on the website",
      "Lead capture forms",
      "Advanced analytics",
      "Priority support",
    ],
    upgradeTo: "website_premium",
  },
  website_premium: {
    label: "Managed Premium",
    price: "$129",
    includes: [
      ...ALL_PLANS,
      "10 change requests per month, same-day turnaround",
      "Everything in Managed Pro (AI chatbot, lead capture forms, advanced analytics)",
      "Dedicated account manager",
      "Quarterly custom-feature credit",
      "Priority phone + Slack support",
      "Industry-specific features (menu management, booking, etc.)",
    ],
    upgradeTo: null,
  },
};

/** Never part of ANY plan. Social may become a paid extra only if Blayke approves it. */
export const NEVER_INCLUDED = [
  "Social media (Facebook, Instagram, TikTok, etc.): creating, running, posting to or fixing pages — the customer's own",
  "Running or managing their ads, or anything inside their ad accounts",
  "Their other accounts (email, booking systems, payment processors, directories other than Google)",
  "Custom features — online ordering, payment funnels, CRM integrations — are one-time add-ons quoted per project",
];

const PLAN_ALIASES: Record<string, PlanKey> = {
  website_managed_annual: "website_managed",
  website_pro_annual: "website_pro",
  website_premium_annual: "website_premium",
  starter_bundle: "website_managed",
  growth_bundle: "website_pro",
  full_suite: "website_premium",
  enterprise_suite: "website_premium",
};

/** The website tier a subscription's plan key includes (annual and bundles map to their tier). */
export function websiteTier(plan: string | null | undefined): PlanKey | null {
  if (!plan) return null;
  if (plan in PLAN_SCOPE) return plan as PlanKey;
  return PLAN_ALIASES[plan] ?? null;
}

export function isPlanKey(plan: string | null | undefined): plan is PlanKey {
  return !!plan && plan in PLAN_SCOPE;
}

/**
 * The scope block handed to Andy and to every reviewer for this customer: what they have,
 * what no plan has, and exactly how to offer an upgrade when they ask for more.
 */
export function describeScope(rawPlan: string | null | undefined): string {
  const plan = websiteTier(rawPlan);
  if (!plan) {
    return [
      "PLAN: none active. Do not promise any work. If they want changes, point them to choosing a plan",
      "(Billing tab in their portal) and flag it to Blayke.",
    ].join(" ");
  }
  const s = PLAN_SCOPE[plan];
  const up = s.upgradeTo ? PLAN_SCOPE[s.upgradeTo] : null;
  return [
    `PLAN: ${s.label} (${s.price}/month). It includes ONLY:`,
    ...s.includes.map((i) => `  - ${i}`),
    "NOT included in any plan:",
    ...NEVER_INCLUDED.map((i) => `  - ${i}`),
    "IF THEY ASK FOR SOMETHING OUTSIDE THEIR PLAN: don't do it, don't promise it, don't flatly refuse.",
    up
      ? `  Say it isn't part of their ${s.label} plan; if ${up.label} (${up.price}/month) includes it, offer that upgrade (Upgrades tab in their portal); otherwise offer to have the team quote it as a one-time add-on. Flag it to Blayke.`
      : `  Say it isn't part of their ${s.label} plan and offer to have the team quote it as a one-time add-on. Flag it to Blayke.`,
    "  Social media is never offered or priced by us — Blayke decides if it is ever sold as an extra.",
  ].join("\n");
}
