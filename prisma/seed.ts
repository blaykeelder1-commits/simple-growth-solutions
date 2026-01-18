import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Production-safe database seed
 * Only seeds system-level reference data (industry benchmarks)
 * Does NOT create test users, organizations, or demo data
 */
async function main() {
  console.log("Starting production database seed...");

  // Create industry benchmarks for Cash Flow AI
  // These are system-level reference data, not user data
  const benchmarks = [
    {
      industry: "technology",
      avgDaysToPay: 32.5,
      medianDaysToPay: 30.0,
      stdDevDaysToPay: 12.5,
      pctPayOnTime: 65.0,
      pctPay30Days: 25.0,
      pctPay60Days: 7.0,
      pctPay90Plus: 3.0,
      economicSensitivity: 1.2,
      sampleSize: 5000,
    },
    {
      industry: "healthcare",
      avgDaysToPay: 45.0,
      medianDaysToPay: 42.0,
      stdDevDaysToPay: 18.0,
      pctPayOnTime: 45.0,
      pctPay30Days: 35.0,
      pctPay60Days: 15.0,
      pctPay90Plus: 5.0,
      economicSensitivity: 0.8,
      sampleSize: 8000,
    },
    {
      industry: "retail",
      avgDaysToPay: 28.0,
      medianDaysToPay: 25.0,
      stdDevDaysToPay: 10.0,
      pctPayOnTime: 70.0,
      pctPay30Days: 22.0,
      pctPay60Days: 5.0,
      pctPay90Plus: 3.0,
      economicSensitivity: 1.5,
      sampleSize: 12000,
    },
    {
      industry: "manufacturing",
      avgDaysToPay: 42.0,
      medianDaysToPay: 40.0,
      stdDevDaysToPay: 15.0,
      pctPayOnTime: 50.0,
      pctPay30Days: 32.0,
      pctPay60Days: 12.0,
      pctPay90Plus: 6.0,
      economicSensitivity: 1.3,
      sampleSize: 6000,
    },
    {
      industry: "construction",
      avgDaysToPay: 55.0,
      medianDaysToPay: 50.0,
      stdDevDaysToPay: 22.0,
      pctPayOnTime: 35.0,
      pctPay30Days: 38.0,
      pctPay60Days: 18.0,
      pctPay90Plus: 9.0,
      economicSensitivity: 1.4,
      sampleSize: 4500,
    },
    {
      industry: "professional_services",
      avgDaysToPay: 35.0,
      medianDaysToPay: 32.0,
      stdDevDaysToPay: 14.0,
      pctPayOnTime: 60.0,
      pctPay30Days: 28.0,
      pctPay60Days: 8.0,
      pctPay90Plus: 4.0,
      economicSensitivity: 1.0,
      sampleSize: 7500,
    },
    {
      industry: "food_service",
      avgDaysToPay: 22.0,
      medianDaysToPay: 18.0,
      stdDevDaysToPay: 8.0,
      pctPayOnTime: 78.0,
      pctPay30Days: 17.0,
      pctPay60Days: 3.0,
      pctPay90Plus: 2.0,
      economicSensitivity: 1.6,
      sampleSize: 10000,
    },
    {
      industry: "hospitality",
      avgDaysToPay: 25.0,
      medianDaysToPay: 22.0,
      stdDevDaysToPay: 9.0,
      pctPayOnTime: 72.0,
      pctPay30Days: 20.0,
      pctPay60Days: 5.0,
      pctPay90Plus: 3.0,
      economicSensitivity: 1.7,
      sampleSize: 8500,
    },
    {
      industry: "real_estate",
      avgDaysToPay: 38.0,
      medianDaysToPay: 35.0,
      stdDevDaysToPay: 14.0,
      pctPayOnTime: 55.0,
      pctPay30Days: 30.0,
      pctPay60Days: 10.0,
      pctPay90Plus: 5.0,
      economicSensitivity: 1.4,
      sampleSize: 5500,
    },
    {
      industry: "education",
      avgDaysToPay: 40.0,
      medianDaysToPay: 38.0,
      stdDevDaysToPay: 12.0,
      pctPayOnTime: 58.0,
      pctPay30Days: 30.0,
      pctPay60Days: 8.0,
      pctPay90Plus: 4.0,
      economicSensitivity: 0.6,
      sampleSize: 4000,
    },
    {
      industry: "non_profit",
      avgDaysToPay: 48.0,
      medianDaysToPay: 45.0,
      stdDevDaysToPay: 16.0,
      pctPayOnTime: 42.0,
      pctPay30Days: 35.0,
      pctPay60Days: 15.0,
      pctPay90Plus: 8.0,
      economicSensitivity: 0.9,
      sampleSize: 3500,
    },
    {
      industry: "transportation",
      avgDaysToPay: 35.0,
      medianDaysToPay: 32.0,
      stdDevDaysToPay: 13.0,
      pctPayOnTime: 58.0,
      pctPay30Days: 28.0,
      pctPay60Days: 10.0,
      pctPay90Plus: 4.0,
      economicSensitivity: 1.3,
      sampleSize: 6500,
    },
  ];

  for (const benchmark of benchmarks) {
    await prisma.industryBenchmark.upsert({
      where: { industry: benchmark.industry },
      update: benchmark,
      create: benchmark,
    });
  }

  console.log(`✓ Created ${benchmarks.length} industry benchmarks`);

  console.log("\n✅ Production database seed completed!");
  console.log("\nNote: No test users or demo data created.");
  console.log("Users will sign up through the application.\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
