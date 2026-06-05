// Founding-rate pricing for the website management plans.
//
// A promo code (PromoCode model) grants "founding" pricing: the customer pays
// the published founding rate below instead of the standard plan price, and the
// recurring Square subscription is provisioned against a dedicated founding
// plan variation so the discount persists every month.
//
// To change founding prices: edit FOUNDING_PRICE_CENTS (or set the env
// overrides), then re-run `npx tsx scripts/setup-square-plans.ts` so the Square
// founding plan variations match, and update the SQUARE_PLAN_*_FOUNDING_ID env
// vars with the IDs it prints.

import type { PrismaClient, PromoCode } from "@prisma/client";

export type WebsitePlanKey = "website_managed" | "website_pro" | "website_premium";

export const WEBSITE_PLAN_KEYS: WebsitePlanKey[] = [
  "website_managed",
  "website_pro",
  "website_premium",
];

export function isWebsitePlan(plan: string): plan is WebsitePlanKey {
  return (WEBSITE_PLAN_KEYS as string[]).includes(plan);
}

// Standard monthly prices (cents) — kept in sync with PLANS in stripe.ts and
// the Square plan variations.
export const STANDARD_PRICE_CENTS: Record<WebsitePlanKey, number> = {
  website_managed: 4900,
  website_pro: 7900,
  website_premium: 12900,
};

// Published founding prices (cents). Env overrides let you tune without a code
// change, but the Square founding variations must be created at the SAME price.
export const FOUNDING_PRICE_CENTS: Record<WebsitePlanKey, number> = {
  website_managed: numEnv("SQUARE_FOUNDING_PRICE_WEBSITE_MANAGED", 2900),
  website_pro: numEnv("SQUARE_FOUNDING_PRICE_WEBSITE_PRO", 4900),
  website_premium: numEnv("SQUARE_FOUNDING_PRICE_WEBSITE_PREMIUM", 7900),
};

// How many months the founding rate lasts before auto-reverting to standard
// pricing. Billed via Square subscription phases (see setup-square-plans.ts):
// month 1 is the checkout payment link, months 2..N are the founding phase on
// the subscription, then the standard phase runs indefinitely. Changing this
// requires re-running setup-square-plans.ts so the Square variations match.
export const FOUNDING_INTRO_MONTHS = numEnv("SQUARE_FOUNDING_INTRO_MONTHS", 3);

function numEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// The Square founding plan-variation ID for a plan (set after running
// setup-square-plans.ts). Returns null if not configured.
export function foundingPlanVariationId(plan: WebsitePlanKey): string | null {
  switch (plan) {
    case "website_managed":
      return process.env.SQUARE_PLAN_WEBSITE_MANAGED_FOUNDING_ID || null;
    case "website_pro":
      return process.env.SQUARE_PLAN_WEBSITE_PRO_FOUNDING_ID || null;
    case "website_premium":
      return process.env.SQUARE_PLAN_WEBSITE_PREMIUM_FOUNDING_ID || null;
  }
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export interface PromoValidationOk {
  ok: true;
  promo: PromoCode;
  plan: WebsitePlanKey;
  standardCents: number;
  foundingCents: number;
  introMonths: number;
}
export interface PromoValidationErr {
  ok: false;
  error: string;
}
export type PromoValidation = PromoValidationOk | PromoValidationErr;

// Validates a promo code against a chosen website plan. Pure read — does NOT
// increment redemptions (that happens when the subscription activates).
export async function validatePromoCode(
  prisma: PrismaClient,
  rawCode: string,
  plan: string,
  now: Date = new Date()
): Promise<PromoValidation> {
  if (!isWebsitePlan(plan)) {
    return { ok: false, error: "Promo codes apply to website plans only." };
  }
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a promo code." };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return { ok: false, error: "That code isn't valid." };
  }
  if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
    return { ok: false, error: "That code has expired." };
  }
  if (
    promo.maxRedemptions != null &&
    promo.redeemedCount >= promo.maxRedemptions
  ) {
    return { ok: false, error: "That code has been fully redeemed." };
  }
  if (promo.restrictToPlan && promo.restrictToPlan !== plan) {
    return {
      ok: false,
      error: "That code doesn't apply to the selected plan.",
    };
  }

  return {
    ok: true,
    promo,
    plan,
    standardCents: STANDARD_PRICE_CENTS[plan],
    foundingCents: FOUNDING_PRICE_CENTS[plan],
    introMonths: FOUNDING_INTRO_MONTHS,
  };
}
