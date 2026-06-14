// One-time setup: create Square subscription plans for SGS's billing.
// After running, copy the printed SQUARE_PLAN_*_ID values into .env.production
// (or your hosting platform's env panel).
//
// Usage:
//   SQUARE_ACCESS_TOKEN=... SQUARE_LOCATION_ID=... SQUARE_ENVIRONMENT=sandbox \
//     npx tsx scripts/setup-square-plans.ts [--founding-only]
//
// --founding-only: skip the standard plans (already created in prod) and only
//   create the founding-rate variations. Use this when adding founding pricing
//   to an environment that already has the standard plan IDs configured.

import {
  getSgsSquareConfig,
  createSubscriptionPlanVariation,
} from "../src/lib/billing/square";
import {
  FOUNDING_PRICE_CENTS,
  FOUNDING_INTRO_MONTHS,
} from "../src/lib/billing/founding";

async function main() {
  const foundingOnly = process.argv.includes("--founding-only");
  const annualOnly = process.argv.includes("--annual-only");
  const cfg = getSgsSquareConfig();
  if (!cfg) {
    console.error(
      "Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID."
    );
    process.exit(1);
  }

  console.log(`Using Square environment: ${cfg.environment}`);
  console.log(`Location ID: ${cfg.locationId}`);
  console.log(foundingOnly ? "Mode: founding variations only\n" : "Mode: standard + founding\n");

  // $1 end-to-end connectivity test plan. Lets us verify checkout → payment →
  // webhook → subscription → emails for a buck. Skipped in --founding-only.
  if (!foundingOnly && !annualOnly) {
    try {
      console.log("Creating plan: Square Test ($1.00/mo)...");
      const test = await createSubscriptionPlanVariation(cfg, {
        name: "Square Test",
        phases: [{ amountCents: 100 }],
      });
      console.log(`  ✓ Test plan variation ID: ${test.planVariationId}`);
      console.log(`  → Set SQUARE_PLAN_WEBSITE_TEST_ID=${test.planVariationId}\n`);
    } catch (err) {
      console.error("  ✗ Failed to create Square Test plan:", err);
    }
  }

  // Standard plans + their founding-rate counterparts. A subscription created
  // with a promo code is provisioned against the founding variation so the
  // discounted price persists every month (see the square-webhook handler).
  const plans = [
    { key: "WEBSITE_MANAGED", plan: "website_managed", name: "Managed Website", amountCents: 4900 },
    { key: "WEBSITE_PRO", plan: "website_pro", name: "Managed Website Pro", amountCents: 7900 },
    { key: "WEBSITE_PREMIUM", plan: "website_premium", name: "Managed Website Premium", amountCents: 12900 },
  ] as const;

  for (const plan of plans) {
    if (annualOnly) break; // annual-only run skips standard + founding entirely
    if (!foundingOnly) {
      try {
        console.log(`Creating plan: ${plan.name} ($${(plan.amountCents / 100).toFixed(2)}/mo)...`);
        const result = await createSubscriptionPlanVariation(cfg, {
          name: plan.name,
          phases: [{ amountCents: plan.amountCents }],
        });
        console.log(`  ✓ Plan variation ID: ${result.planVariationId}`);
        console.log(`  → Set SQUARE_PLAN_${plan.key}_ID=${result.planVariationId}\n`);
      } catch (err) {
        console.error(`  ✗ Failed to create ${plan.name}:`, err);
      }
    }

    // Founding-rate variation — introductory pricing that auto-reverts.
    // Month 1 is collected by the checkout payment link at the founding price;
    // the subscription starts at month 2, so the founding PHASE on the
    // subscription covers the REMAINING (INTRO_MONTHS - 1) months, then the
    // standard phase runs indefinitely. Example (3-month intro): link = month 1
    // @ founding, sub phase 1 = 2 months @ founding, sub phase 2 = standard.
    const foundingCents = FOUNDING_PRICE_CENTS[plan.plan];
    const remainingFoundingMonths = Math.max(0, FOUNDING_INTRO_MONTHS - 1);
    const phases =
      remainingFoundingMonths > 0
        ? [
            { amountCents: foundingCents, periods: remainingFoundingMonths },
            { amountCents: plan.amountCents },
          ]
        : [{ amountCents: plan.amountCents }]; // 1-month intro: link covers it, sub is all standard
    try {
      console.log(
        `Creating founding plan: ${plan.name} — Founding ($${(foundingCents / 100).toFixed(2)}/mo for ${FOUNDING_INTRO_MONTHS}mo, then $${(plan.amountCents / 100).toFixed(2)})...`
      );
      const result = await createSubscriptionPlanVariation(cfg, {
        name: `${plan.name} — Founding`,
        phases,
      });
      console.log(`  ✓ Founding plan variation ID: ${result.planVariationId}`);
      console.log(`  → Set SQUARE_PLAN_${plan.key}_FOUNDING_ID=${result.planVariationId}\n`);
    } catch (err) {
      console.error(`  ✗ Failed to create founding ${plan.name}:`, err);
    }
  }

  // Annual variations (ANNUAL cadence, flat price = 10× monthly). Skipped in
  // --founding-only. Run with --annual-only to add just these to an account
  // that already has the monthly + founding plans.
  if (!foundingOnly) {
    const annualPlans = [
      { key: "WEBSITE_MANAGED_ANNUAL", name: "Managed Website (Annual)", amountCents: 49000 },
      { key: "WEBSITE_PRO_ANNUAL", name: "Managed Pro (Annual)", amountCents: 79000 },
      { key: "WEBSITE_PREMIUM_ANNUAL", name: "Managed Premium (Annual)", amountCents: 129000 },
    ] as const;
    for (const plan of annualPlans) {
      try {
        console.log(`Creating annual plan: ${plan.name} ($${(plan.amountCents / 100).toFixed(2)}/yr)...`);
        const result = await createSubscriptionPlanVariation(cfg, {
          name: plan.name,
          cadence: "ANNUAL",
          phases: [{ amountCents: plan.amountCents }],
        });
        console.log(`  ✓ Annual plan variation ID: ${result.planVariationId}`);
        console.log(`  → Set SQUARE_PLAN_${plan.key}_ID=${result.planVariationId}\n`);
      } catch (err) {
        console.error(`  ✗ Failed to create annual ${plan.name}:`, err);
      }
    }
  }

  console.log("Done. Drop the printed SQUARE_PLAN_*_ID values into your env.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
