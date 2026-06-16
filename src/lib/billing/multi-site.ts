// Multi-website pricing for a single customer (organization).
//
// The platform already supports an org owning many WebsiteProjects, each with
// its own change-request queue. This module prices the extra sites.
//
// Model: DISCOUNTED ADD-ON PER SITE.
//   - The first managed site is covered by the base plan (STANDARD_PRICE_CENTS).
//   - Each additional site adds its own recurring line at a discount to a
//     standalone plan, and carries its OWN per-period CR cap (enforced per-project
//     in api/projects/[id]/change-requests/route.ts).
//
// Profitability: the marginal cost of an additional managed site is ~<$2/mo
// hosting (Cloudflare Pages/R2 — see COSTS.md) plus edit labor that Andy now
// automates. So the add-on is ~95% gross margin even at the discounted rate.

import { STANDARD_PRICE_CENTS, type WebsitePlanKey } from "./founding";

// Additional-site add-on price (cents/mo), per base plan tier. Env-overridable
// so pricing can be tuned without a code change; the Square recurring variation
// is created at this exact price when the add-on is provisioned.
export const ADDITIONAL_SITE_PRICE_CENTS: Record<WebsitePlanKey, number> = {
  website_managed: numEnv("ADDITIONAL_SITE_PRICE_WEBSITE_MANAGED", 3500), // $35 (vs $49 standalone)
  website_pro: numEnv("ADDITIONAL_SITE_PRICE_WEBSITE_PRO", 5900), // $59 (vs $79)
  website_premium: numEnv("ADDITIONAL_SITE_PRICE_WEBSITE_PREMIUM", 9900), // $99 (vs $129)
};

function numEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function additionalSitePriceCents(plan: WebsitePlanKey): number {
  return ADDITIONAL_SITE_PRICE_CENTS[plan] ?? 0;
}

// Total recurring price (cents/mo) for `siteCount` managed sites on a plan:
// base plan + (siteCount - 1) × add-on. siteCount <= 1 is just the base price.
export function monthlyTotalCents(plan: WebsitePlanKey, siteCount: number): number {
  const base = STANDARD_PRICE_CENTS[plan] ?? 0;
  const extra = Math.max(0, siteCount - 1);
  return base + extra * additionalSitePriceCents(plan);
}

// Effective per-site monthly cost when running `siteCount` sites — handy for the
// pricing page ("as low as $X/site").
export function effectivePerSiteCents(plan: WebsitePlanKey, siteCount: number): number {
  if (siteCount <= 0) return STANDARD_PRICE_CENTS[plan] ?? 0;
  return Math.round(monthlyTotalCents(plan, siteCount) / siteCount);
}
