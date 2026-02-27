import Stripe from "stripe";

// Stripe client initialized only when API key is available

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// Plan configurations — matches business analysis pricing
export const PLANS = {
  // ── Website Management Tiers ──────────────────────────────────────────
  website_managed: {
    name: "Managed Website",
    priceId: process.env.STRIPE_PRICE_WEBSITE_MANAGED || "price_website_managed",
    amount: 4900, // $49.00
    interval: "month" as const,
    features: [
      "Managed hosting & SSL",
      "Content edits & updates",
      "Security monitoring",
      "Performance optimization",
      "Analytics dashboard",
      "Email support",
    ],
  },
  website_pro: {
    name: "Managed Pro",
    priceId: process.env.STRIPE_PRICE_WEBSITE_PRO || "price_website_pro",
    amount: 7900, // $79.00
    interval: "month" as const,
    features: [
      "Everything in Managed",
      "AI chatbot integration",
      "24-hour edit turnaround",
      "Lead capture forms",
      "Advanced analytics",
      "Priority support",
    ],
  },
  website_premium: {
    name: "Managed Premium",
    priceId: process.env.STRIPE_PRICE_WEBSITE_PREMIUM || "price_website_premium",
    amount: 12900, // $129.00
    interval: "month" as const,
    features: [
      "Everything in Managed Pro",
      "Monthly SEO report & optimization",
      "Google Business integration",
      "Industry-specific features",
      "Menu management (restaurants)",
      "Same-day priority support",
    ],
  },

  // ── Accounts Receivable ───────────────────────────────────────────────
  cashflow_ai: {
    name: "AR Collection",
    priceId: null, // Success fee only - 8%
    amount: 0,
    interval: null,
    successFeePercentage: 0.08,
    features: [
      "Invoice recovery automation",
      "Cash flow dashboard & prediction",
      "QuickBooks/Xero sync",
      "AI-powered recovery strategies",
      "Client payment scoring",
    ],
  },
  ar_proactive: {
    name: "Proactive AR Management",
    priceId: process.env.STRIPE_PRICE_AR_PROACTIVE || "price_ar_proactive",
    amount: 4900, // $49.00
    interval: "month" as const,
    features: [
      "Automated payment reminders",
      "Aging reports & tracking",
      "Payment tracking before overdue",
      "Custom reminder sequences",
      "Proactive risk alerts",
    ],
  },

  // ── GEO (Geoffrey) — AI Business Mentor ───────────────────────────────
  geo_starter: {
    name: "GEO Starter",
    priceId: process.env.STRIPE_PRICE_GEO_STARTER || "price_geo_starter",
    amount: 7900, // $79.00
    interval: "month" as const,
    features: [
      "24/7 AI business mentor",
      "Website analytics integration",
      "General business Q&A",
      "Weekly insight reports",
      "Industry benchmarks",
    ],
  },
  geo_pro: {
    name: "GEO Pro",
    priceId: process.env.STRIPE_PRICE_GEO_PRO || "price_geo_pro",
    amount: 14900, // $149.00
    interval: "month" as const,
    features: [
      "Everything in GEO Starter",
      "AR & cash flow integration",
      "Custom KPI tracking",
      "Daily AI insights",
      "Personalized action plans",
    ],
  },
  geo_enterprise: {
    name: "GEO Enterprise",
    priceId: process.env.STRIPE_PRICE_GEO_ENTERPRISE || "price_geo_enterprise",
    amount: 24900, // $249.00
    interval: "month" as const,
    features: [
      "Everything in GEO Pro",
      "NanoClaw automation (coming soon)",
      "Multi-location support",
      "Team member access",
      "Dedicated account support",
    ],
  },

  // ── Bundles ───────────────────────────────────────────────────────────
  starter_bundle: {
    name: "Starter Bundle",
    priceId: process.env.STRIPE_PRICE_STARTER_BUNDLE || "price_starter_bundle",
    amount: 9900, // $99.00 (saves 23% vs $128 a la carte)
    interval: "month" as const,
    features: [
      "Managed Website ($49 value)",
      "GEO Starter AI mentor ($79 value)",
      "Website analytics in GEO",
      "Weekly insight reports",
    ],
  },
  growth_bundle: {
    name: "Growth Bundle",
    priceId: process.env.STRIPE_PRICE_GROWTH_BUNDLE || "price_growth_bundle",
    amount: 17900, // $179.00 (saves 21% vs $228 a la carte) + AR fees
    interval: "month" as const,
    features: [
      "Managed Pro website ($79 value)",
      "AR Collection at 8%",
      "GEO Pro AI mentor ($149 value)",
      "Full data integration",
    ],
  },
  full_suite: {
    name: "Full Suite",
    priceId: process.env.STRIPE_PRICE_FULL_SUITE || "price_full_suite",
    amount: 22900, // $229.00 (saves 18% vs $278 a la carte) + AR fees
    interval: "month" as const,
    features: [
      "Managed Premium website ($129 value)",
      "AR Collection at 8%",
      "GEO Pro AI mentor ($149 value)",
      "SEO + Google Business integration",
    ],
  },
  enterprise_suite: {
    name: "Enterprise Suite",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_SUITE || "price_enterprise_suite",
    amount: 29900, // $299.00 (saves 21% vs $378 a la carte) + AR fees
    interval: "month" as const,
    features: [
      "Managed Premium website ($129 value)",
      "AR Collection at 8%",
      "GEO Enterprise AI mentor ($249 value)",
      "NanoClaw automation (coming soon)",
      "Multi-location + team access",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Plans that support Stripe checkout (have a priceId)
export type CheckoutPlanType = Exclude<PlanType, "cashflow_ai">;

// Create Stripe checkout session
export async function createCheckoutSession({
  organizationId,
  plan,
  customerId,
  successUrl,
  cancelUrl,
}: {
  organizationId: string;
  plan: CheckoutPlanType;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error("Stripe not configured");

  const planConfig = PLANS[plan];
  if (!planConfig.priceId) throw new Error("Plan has no price ID");

  const session = await stripe.checkout.sessions.create({
    customer: customerId || undefined,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      plan,
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
      },
    },
  });

  return session;
}

// Create Stripe customer portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  if (!stripe) throw new Error("Stripe not configured");

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Get subscription status
export async function getSubscriptionStatus(subscriptionId: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) throw new Error("Stripe not configured");

  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

// Create invoice for success fees (Cash Flow AI / AR Collection)
export async function createSuccessFeeInvoice({
  customerId,
  amount,
  description,
}: {
  customerId: string;
  amount: number; // in cents
  description: string;
}) {
  if (!stripe) throw new Error("Stripe not configured");

  // Create invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency: "usd",
    description,
  });

  // Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
  });

  return invoice;
}
