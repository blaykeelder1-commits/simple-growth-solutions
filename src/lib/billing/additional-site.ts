// Recurring billing for an ADDITIONAL managed website under an org that already
// has a base plan. Mirrors the discounted-add-on model in ./multi-site.ts.
//
// Safe + loud by design: this never throws into the route. It returns a
// structured result so the caller can flag an unbilled site (no_card_on_file /
// square_not_configured / provision_failed) instead of silently giving it away.
// Billing is charged to the org's existing card on file — the standard "add a
// seat, get billed" SaaS flow — only after the customer accepts the fee.

import { prisma } from "@/lib/db/prisma";
import {
  getSgsSquareConfig,
  createSubscriptionPlanVariation,
  createSubscription,
} from "./square";
import { additionalSitePriceCents } from "./multi-site";
import type { WebsitePlanKey } from "./founding";
import { apiLogger } from "@/lib/logger";

export interface AdditionalSiteResult {
  billed: boolean;
  reason?: "square_not_configured" | "no_card_on_file" | "provision_failed";
  priceCents: number;
  subscriptionId?: string;
}

export async function provisionAdditionalSite(
  organizationId: string,
  basePlan: WebsitePlanKey,
  siteName: string
): Promise<AdditionalSiteResult> {
  const priceCents = additionalSitePriceCents(basePlan);
  const cfg = getSgsSquareConfig();
  if (!cfg) return { billed: false, reason: "square_not_configured", priceCents };

  // The org's active base sub holds the Square customer + card on file.
  const baseSub = await prisma.subscription.findFirst({
    where: {
      organizationId,
      status: { in: ["active", "trialing"] },
      processor: "square",
      squareCustomerId: { not: null },
      squareCardId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!baseSub?.squareCustomerId || !baseSub.squareCardId) {
    return { billed: false, reason: "no_card_on_file", priceCents };
  }

  try {
    const variation = await createSubscriptionPlanVariation(cfg, {
      name: `Additional site — ${basePlan} — ${siteName}`.slice(0, 60),
      phases: [{ amountCents: priceCents }],
    });
    const sub = await createSubscription(cfg, {
      customerId: baseSub.squareCustomerId,
      cardId: baseSub.squareCardId,
      planVariationId: variation.planVariationId,
    });
    // One Subscription row per billed site: an org's active website_ sub count
    // equals its billed-site count, which keeps the dispatch-board plan lookup
    // and per-site cap accounting consistent.
    await prisma.subscription.create({
      data: {
        organizationId,
        processor: "square",
        plan: basePlan,
        status: "active",
        priceMonthly: priceCents,
        squareCustomerId: baseSub.squareCustomerId,
        squareCardId: baseSub.squareCardId,
        squareSubscriptionId: sub.id,
        squarePlanVariationId: variation.planVariationId,
      },
    });
    return { billed: true, priceCents, subscriptionId: sub.id };
  } catch (e) {
    apiLogger.error(
      { err: e, organizationId, basePlan },
      "Failed to provision additional-site add-on"
    );
    return { billed: false, reason: "provision_failed", priceCents };
  }
}
