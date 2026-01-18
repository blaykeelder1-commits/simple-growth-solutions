import Stripe from "stripe";

// Stripe client initialized only when API key is available

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    })
  : null;

// Plan configurations
export const PLANS = {
  website_management: {
    name: "Website Management + Automation",
    priceId: process.env.STRIPE_PRICE_WEBSITE_MANAGEMENT || "price_website_management",
    amount: 7900, // $79.00 in cents
    interval: "month" as const,
    features: [
      "Managed website hosting",
      "Monthly updates and maintenance",
      "Analytics dashboard",
      "Priority support",
      "Automation tools",
    ],
  },
  cybersecurity: {
    name: "Cybersecurity Shield",
    priceId: process.env.STRIPE_PRICE_CYBERSECURITY || "price_cybersecurity",
    amount: 3900, // $39.00 in cents
    interval: "month" as const,
    features: [
      "Weekly security scans",
      "SSL monitoring",
      "Vulnerability alerts",
      "Security headers check",
      "Remediation guidance",
    ],
  },
  chauffeur: {
    name: "Business Chauffeur",
    priceId: process.env.STRIPE_PRICE_CHAUFFEUR || "price_chauffeur",
    amount: 19900, // $199.00 in cents (premium TBD)
    interval: "month" as const,
    features: [
      "POS integration",
      "Accounting sync",
      "Review monitoring",
      "AI business insights",
      "Competitor analysis",
    ],
  },
  cashflow_ai: {
    name: "Cash Flow AI",
    priceId: null, // Success fee only - 8%
    amount: 0,
    interval: null,
    successFeePercentage: 0.08,
    features: [
      "Invoice recovery automation",
      "Payment predictions",
      "Cash flow forecasting",
      "QuickBooks/Xero sync",
      "AI recommendations",
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Create Stripe checkout session
export async function createCheckoutSession({
  organizationId,
  plan,
  customerId,
  successUrl,
  cancelUrl,
}: {
  organizationId: string;
  plan: Exclude<PlanType, "cashflow_ai">;
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

// Create invoice for success fees (Cash Flow AI)
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
