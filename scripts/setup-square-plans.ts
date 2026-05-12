// One-time setup: create Square subscription plans for SGS's billing.
// After running, copy the printed SQUARE_PLAN_*_ID values into .env.production
// (or your hosting platform's env panel).
//
// Usage:
//   SQUARE_ACCESS_TOKEN=... SQUARE_LOCATION_ID=... SQUARE_ENVIRONMENT=sandbox \
//     npx tsx scripts/setup-square-plans.ts

import {
  getSgsSquareConfig,
  createSubscriptionPlanVariation,
} from "../src/lib/billing/square";

async function main() {
  const cfg = getSgsSquareConfig();
  if (!cfg) {
    console.error(
      "Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID."
    );
    process.exit(1);
  }

  console.log(`Using Square environment: ${cfg.environment}`);
  console.log(`Location ID: ${cfg.locationId}\n`);

  const plans = [
    { key: "WEBSITE_MANAGED", name: "Managed Website", amountCents: 4900 },
    { key: "WEBSITE_PRO", name: "Managed Website Pro", amountCents: 7900 },
  ] as const;

  for (const plan of plans) {
    try {
      console.log(`Creating plan: ${plan.name} ($${(plan.amountCents / 100).toFixed(2)}/mo)...`);
      const result = await createSubscriptionPlanVariation(cfg, {
        name: plan.name,
        amountCents: plan.amountCents,
      });
      console.log(`  ✓ Plan variation ID: ${result.planVariationId}`);
      console.log(`  → Set SQUARE_PLAN_${plan.key}_ID=${result.planVariationId}\n`);
    } catch (err) {
      console.error(`  ✗ Failed to create ${plan.name}:`, err);
    }
  }

  console.log("Done. Drop the printed SQUARE_PLAN_*_ID values into your env.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
