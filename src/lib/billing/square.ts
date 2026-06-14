// Square billing for SGS-side revenue (subscriptions + one-off payment links).
//
// This module uses an SGS-OWNED Square access token (SQUARE_ACCESS_TOKEN) for
// SGS's own Square account — distinct from src/lib/integrations/square.ts which
// handles OAuth into CUSTOMER Square accounts to read their order data.
//
// Customer payment model:
//   1. Customer chooses Managed / Pro on pricing page
//   2. We create a Square Customer + a Payment Link for the first month
//   3. They pay → Square captures their card → webhook fires
//   4. We create a Square Subscription on that card → auto-charges monthly
//
// One-off charges (rush tickets, custom upcharges) use Payment Links directly.
//
// Required env vars:
//   SQUARE_ACCESS_TOKEN              — SGS merchant access token
//   SQUARE_LOCATION_ID               — location to bill against
//   SQUARE_ENVIRONMENT               — sandbox | production (default: sandbox)
//   SQUARE_WEBHOOK_SIGNATURE_KEY     — for verifying webhook signatures
//   SQUARE_PLAN_WEBSITE_MANAGED_ID   — set after running setup-square-plans.ts
//   SQUARE_PLAN_WEBSITE_PRO_ID       — same
//   SQUARE_PLAN_WEBSITE_PREMIUM_ID   — same

import { createHmac, timingSafeEqual } from "crypto";

const API_VERSION = "2024-12-18";

type SquareEnv = "sandbox" | "production";

export interface SgsSquareConfig {
  accessToken: string;
  locationId: string;
  environment: SquareEnv;
  webhookKey: string | null;
  planIds: {
    website_test: string | null;
    website_managed: string | null;
    website_pro: string | null;
    website_premium: string | null;
    website_managed_annual: string | null;
    website_pro_annual: string | null;
    website_premium_annual: string | null;
  };
}

export function getSgsSquareConfig(): SgsSquareConfig | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = (process.env.SQUARE_ENVIRONMENT || "sandbox") as SquareEnv;
  if (!accessToken || !locationId) return null;
  return {
    accessToken,
    locationId,
    environment,
    webhookKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || null,
    planIds: {
      website_test: process.env.SQUARE_PLAN_WEBSITE_TEST_ID || null,
      website_managed: process.env.SQUARE_PLAN_WEBSITE_MANAGED_ID || null,
      website_pro: process.env.SQUARE_PLAN_WEBSITE_PRO_ID || null,
      website_premium: process.env.SQUARE_PLAN_WEBSITE_PREMIUM_ID || null,
      website_managed_annual: process.env.SQUARE_PLAN_WEBSITE_MANAGED_ANNUAL_ID || null,
      website_pro_annual: process.env.SQUARE_PLAN_WEBSITE_PRO_ANNUAL_ID || null,
      website_premium_annual: process.env.SQUARE_PLAN_WEBSITE_PREMIUM_ANNUAL_ID || null,
    },
  };
}

function apiBase(env: SquareEnv): string {
  return env === "sandbox"
    ? "https://connect.squareupsandbox.com/v2"
    : "https://connect.squareup.com/v2";
}

async function request<T>(
  cfg: SgsSquareConfig,
  endpoint: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Square-Version": API_VERSION,
  };
  const body = init.body
    ? JSON.stringify(
        init.idempotencyKey
          ? { idempotency_key: init.idempotencyKey, ...(init.body as object) }
          : init.body
      )
    : undefined;
  const res = await fetch(`${apiBase(cfg.environment)}${endpoint}`, {
    method: init.method || "GET",
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square API ${res.status} on ${endpoint}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// Customers
// ============================================================

export interface SquareCustomer {
  id: string;
  emailAddress?: string;
  givenName?: string;
}

export async function findOrCreateCustomer(
  cfg: SgsSquareConfig,
  email: string,
  name?: string
): Promise<SquareCustomer> {
  // Search first to dedupe.
  const search = await request<{ customers?: Array<{ id: string; email_address?: string; given_name?: string }> }>(
    cfg,
    "/customers/search",
    {
      method: "POST",
      body: {
        query: {
          filter: { email_address: { exact: email } },
        },
      },
    }
  );
  const found = search.customers?.[0];
  if (found) {
    return { id: found.id, emailAddress: found.email_address, givenName: found.given_name };
  }
  const created = await request<{ customer: { id: string; email_address?: string; given_name?: string } }>(
    cfg,
    "/customers",
    {
      method: "POST",
      idempotencyKey: `cust-${email}-${Date.now()}`,
      body: {
        email_address: email,
        ...(name ? { given_name: name } : {}),
      },
    }
  );
  return {
    id: created.customer.id,
    emailAddress: created.customer.email_address,
    givenName: created.customer.given_name,
  };
}

// ============================================================
// Payment Links (one-off charges)
// ============================================================

export interface CreatePaymentLinkParams {
  amountCents: number;
  description: string;
  redirectUrl?: string;
  buyerEmail?: string;
  // When provided, the underlying Order is associated with this Square customer,
  // which causes Square to auto-save the card on file (so we can later create
  // an auto-renewing Subscription against it).
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentLink {
  id: string;
  url: string;
  orderId?: string;
}

export async function createPaymentLink(
  cfg: SgsSquareConfig,
  params: CreatePaymentLinkParams
): Promise<PaymentLink> {
  // Two body shapes:
  //   - quick_pay: anonymous one-off (no card-on-file)
  //   - order: explicit Order with customer_id (Square saves the card)
  // We use order shape whenever a customerId is supplied so the resulting
  // payment is attributable and the card can be reused for subscriptions.
  const body = params.customerId
    ? {
        order: {
          location_id: cfg.locationId,
          customer_id: params.customerId,
          line_items: [
            {
              name: params.description,
              quantity: "1",
              base_price_money: {
                amount: params.amountCents,
                currency: "USD",
              },
            },
          ],
          ...(params.metadata
            ? {
                metadata: params.metadata,
              }
            : {}),
        },
        ...(params.redirectUrl || params.buyerEmail
          ? {
              checkout_options: {
                ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
              },
              ...(params.buyerEmail
                ? { pre_populated_data: { buyer_email: params.buyerEmail } }
                : {}),
            }
          : {}),
      }
    : {
        quick_pay: {
          name: params.description,
          price_money: { amount: params.amountCents, currency: "USD" },
          location_id: cfg.locationId,
        },
        ...(params.redirectUrl
          ? { checkout_options: { redirect_url: params.redirectUrl } }
          : {}),
        ...(params.buyerEmail
          ? { pre_populated_data: { buyer_email: params.buyerEmail } }
          : {}),
        ...(params.metadata ? { payment_note: JSON.stringify(params.metadata) } : {}),
      };
  const res = await request<{
    payment_link: { id: string; url: string; order_id?: string };
  }>(cfg, "/online-checkout/payment-links", {
    method: "POST",
    idempotencyKey: `link-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    body,
  });
  return {
    id: res.payment_link.id,
    url: res.payment_link.url,
    orderId: res.payment_link.order_id,
  };
}

// ============================================================
// Payments (used by webhook to read card-on-file after payment)
// ============================================================

export interface SquarePayment {
  id: string;
  status?: string;
  orderId?: string;
  customerId?: string;
  cardId?: string;
  totalCents?: number;
}

export async function getPayment(
  cfg: SgsSquareConfig,
  paymentId: string
): Promise<SquarePayment> {
  const res = await request<{
    payment: {
      id: string;
      status?: string;
      order_id?: string;
      customer_id?: string;
      total_money?: { amount?: number };
      card_details?: { card?: { id?: string } };
    };
  }>(cfg, `/payments/${paymentId}`);
  const p = res.payment;
  return {
    id: p.id,
    status: p.status,
    orderId: p.order_id,
    customerId: p.customer_id,
    cardId: p.card_details?.card?.id,
    totalCents: p.total_money?.amount,
  };
}

// ============================================================
// Subscription plans (catalog) + subscriptions
// ============================================================

export interface SquarePlanVariation {
  planVariationId: string;
}

// A single monthly billing phase. `periods` bounds the phase to that many
// monthly cycles before advancing to the next phase; omit it on the final
// phase so it runs indefinitely. Multiple phases model introductory pricing
// (e.g., founding rate for N months, then standard forever).
export interface PlanPhase {
  amountCents: number;
  periods?: number;
}

/**
 * Creates a Subscription Plan + a monthly Variation in the Square catalog.
 * The plan_variation_id returned is what you reference when starting subscriptions.
 *
 * Pass a single phase for a flat plan, or multiple phases for introductory
 * pricing. Run once per plan via setup-square-plans.ts and store the IDs in env.
 */
export async function createSubscriptionPlanVariation(
  cfg: SgsSquareConfig,
  args: { name: string; phases: PlanPhase[]; cadence?: "MONTHLY" | "ANNUAL" }
): Promise<SquarePlanVariation> {
  if (!args.phases.length) throw new Error("At least one phase is required");
  const cadence = args.cadence || "MONTHLY";
  const planObjectId = `#plan-${args.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const variationObjectId = `${planObjectId}-${cadence.toLowerCase()}`;
  const res = await request<{
    catalog_object: {
      id: string;
      subscription_plan_data?: {
        subscription_plan_variations?: Array<{ id: string }>;
      };
    };
  }>(cfg, "/catalog/object", {
    method: "POST",
    body: {
      idempotency_key: `cat-${planObjectId}-${Date.now()}`,
      object: {
        type: "SUBSCRIPTION_PLAN",
        id: planObjectId,
        subscription_plan_data: {
          name: args.name,
          subscription_plan_variations: [
            {
              type: "SUBSCRIPTION_PLAN_VARIATION",
              id: variationObjectId,
              subscription_plan_variation_data: {
                name: `${args.name} — ${cadence === "ANNUAL" ? "Annual" : "Monthly"}`,
                phases: args.phases.map((phase, i) => ({
                  ordinal: i,
                  cadence,
                  ...(phase.periods ? { periods: phase.periods } : {}),
                  pricing: {
                    type: "STATIC",
                    price: { amount: phase.amountCents, currency: "USD" },
                  },
                })),
              },
            },
          ],
        },
      },
    },
  });
  const variation = res.catalog_object.subscription_plan_data?.subscription_plan_variations?.[0];
  if (!variation) throw new Error("Square did not return a plan variation");
  return { planVariationId: variation.id };
}

export interface CreateSubscriptionParams {
  customerId: string;
  cardId: string;
  planVariationId: string;
  startDate?: string; // YYYY-MM-DD; defaults to today
}

export interface SquareSubscription {
  id: string;
  status: string;
  startDate?: string;
  chargedThroughDate?: string;
  cardId?: string;
}

export async function createSubscription(
  cfg: SgsSquareConfig,
  params: CreateSubscriptionParams
): Promise<SquareSubscription> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await request<{
    subscription: {
      id: string;
      status: string;
      start_date?: string;
      charged_through_date?: string;
      card_id?: string;
    };
  }>(cfg, "/subscriptions", {
    method: "POST",
    body: {
      idempotency_key: `sub-${params.customerId}-${params.planVariationId}-${Date.now()}`,
      location_id: cfg.locationId,
      plan_variation_id: params.planVariationId,
      customer_id: params.customerId,
      card_id: params.cardId,
      start_date: params.startDate || today,
    },
  });
  return {
    id: res.subscription.id,
    status: res.subscription.status,
    startDate: res.subscription.start_date,
    chargedThroughDate: res.subscription.charged_through_date,
    cardId: res.subscription.card_id,
  };
}

export async function getSubscription(
  cfg: SgsSquareConfig,
  subscriptionId: string
): Promise<SquareSubscription> {
  const res = await request<{
    subscription: {
      id: string;
      status: string;
      start_date?: string;
      charged_through_date?: string;
      card_id?: string;
    };
  }>(cfg, `/subscriptions/${subscriptionId}`);
  return {
    id: res.subscription.id,
    status: res.subscription.status,
    startDate: res.subscription.start_date,
    chargedThroughDate: res.subscription.charged_through_date,
    cardId: res.subscription.card_id,
  };
}

export async function cancelSubscription(
  cfg: SgsSquareConfig,
  subscriptionId: string
): Promise<void> {
  await request(cfg, `/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: {},
  });
}

// ============================================================
// Webhook signature verification
// ============================================================

/**
 * Verifies a Square webhook signature.
 * See https://developer.squareup.com/docs/webhooks/step3validate
 *
 * Square signs HMAC-SHA256 over: notification_url + raw_body, base64-encoded.
 */
export function verifyWebhookSignature(
  webhookKey: string,
  notificationUrl: string,
  rawBody: string,
  signatureHeader: string
): boolean {
  const expected = createHmac("sha256", webhookKey)
    .update(notificationUrl + rawBody)
    .digest("base64");
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
