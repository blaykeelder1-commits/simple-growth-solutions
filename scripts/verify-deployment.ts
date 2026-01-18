/**
 * Verification Script for Simple Growth Solutions
 *
 * Run this script to verify the deployment is working correctly.
 * Usage: npx tsx scripts/verify-deployment.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface VerificationResult {
  name: string;
  status: "pass" | "fail" | "skip";
  message: string;
  duration?: number;
}

const results: VerificationResult[] = [];

async function test(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      name,
      status: "pass",
      message: "OK",
      duration: Date.now() - start,
    });
  } catch (error) {
    results.push({
      name,
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
  }
}

async function skip(name: string, reason: string): Promise<void> {
  results.push({
    name,
    status: "skip",
    message: reason,
  });
}

async function main() {
  console.log("\n===========================================");
  console.log("  Simple Growth Solutions - Verification");
  console.log("===========================================\n");

  // 1. Database Connection
  await test("Database Connection", async () => {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
  });

  // 2. User Table
  await test("User Table Exists", async () => {
    const count = await prisma.user.count();
    if (count < 0) throw new Error("User table not accessible");
  });

  // 3. Organization Table
  await test("Organization Table Exists", async () => {
    const count = await prisma.organization.count();
    if (count < 0) throw new Error("Organization table not accessible");
  });

  // 4. Invoice Table (Cash Flow AI)
  await test("Invoice Table Exists", async () => {
    const count = await prisma.invoice.count();
    if (count < 0) throw new Error("Invoice table not accessible");
  });

  // 5. Industry Benchmarks
  await test("Industry Benchmarks Loaded", async () => {
    const count = await prisma.industryBenchmark.count();
    if (count === 0) {
      throw new Error("No industry benchmarks found - run seed script");
    }
  });

  // 6. Security Scan Table
  await test("Security Scan Table Exists", async () => {
    const count = await prisma.securityScan.count();
    if (count < 0) throw new Error("Security scan table not accessible");
  });

  // 7. Website Project Table
  await test("Website Project Table Exists", async () => {
    const count = await prisma.websiteProject.count();
    if (count < 0) throw new Error("Website project table not accessible");
  });

  // 8. Subscription Table
  await test("Subscription Table Exists", async () => {
    const count = await prisma.subscription.count();
    if (count < 0) throw new Error("Subscription table not accessible");
  });

  // 9. Audit Log Table
  await test("Audit Log Table Exists", async () => {
    const count = await prisma.auditLog.count();
    if (count < 0) throw new Error("Audit log table not accessible");
  });

  // 10. Admin User
  await test("Admin User Exists", async () => {
    const admin = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    if (!admin) throw new Error("No admin user found - run seed script");
  });

  // Environment Variable Checks
  console.log("\n--- Environment Variables ---\n");

  const envVars = [
    { name: "DATABASE_URL", required: true },
    { name: "DIRECT_URL", required: true },
    { name: "NEXTAUTH_SECRET", required: true },
    { name: "NEXTAUTH_URL", required: true },
    { name: "STRIPE_SECRET_KEY", required: false },
    { name: "STRIPE_WEBHOOK_SECRET", required: false },
    { name: "RESEND_API_KEY", required: false },
    { name: "SENTRY_DSN", required: false },
    { name: "ANTHROPIC_API_KEY", required: false },
    { name: "OPENAI_API_KEY", required: false },
    { name: "GOOGLE_CLIENT_ID", required: false },
    { name: "GOOGLE_CLIENT_SECRET", required: false },
  ];

  for (const { name, required } of envVars) {
    const value = process.env[name];
    if (required && !value) {
      await test(`Env: ${name}`, async () => {
        throw new Error(`Required environment variable ${name} is not set`);
      });
    } else if (value) {
      results.push({
        name: `Env: ${name}`,
        status: "pass",
        message: "Set",
      });
    } else {
      await skip(`Env: ${name}`, "Not set (optional)");
    }
  }

  // Print Results
  console.log("\n--- Results ---\n");

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const result of results) {
    const icon =
      result.status === "pass"
        ? "\x1b[32m✓\x1b[0m"
        : result.status === "fail"
        ? "\x1b[31m✗\x1b[0m"
        : "\x1b[33m○\x1b[0m";

    const duration = result.duration ? ` (${result.duration}ms)` : "";
    console.log(`${icon} ${result.name}${duration}`);

    if (result.status === "fail") {
      console.log(`  \x1b[31m└─ ${result.message}\x1b[0m`);
    } else if (result.status === "skip") {
      console.log(`  \x1b[33m└─ ${result.message}\x1b[0m`);
    }

    if (result.status === "pass") passed++;
    else if (result.status === "fail") failed++;
    else skipped++;
  }

  console.log("\n===========================================");
  console.log(
    `  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m, \x1b[33m${skipped} skipped\x1b[0m`
  );
  console.log("===========================================\n");

  if (failed > 0) {
    console.log("\x1b[31mVerification failed! Fix the issues above.\x1b[0m\n");
    process.exit(1);
  } else {
    console.log("\x1b[32mVerification passed! Ready for deployment.\x1b[0m\n");
  }
}

main()
  .catch((e) => {
    console.error("\x1b[31mVerification script error:\x1b[0m", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
