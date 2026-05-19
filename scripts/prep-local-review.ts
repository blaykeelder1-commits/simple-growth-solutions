// Temporary: flip the demo.sarah test user into "deployed" state so the review
// session can see the new portal hero copy (and the rest of the deployed flow).
// Safe — only touches localhost DB.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL?.includes("localhost")) {
    console.error("Refusing to run: this is meant for local DB only.");
    process.exit(1);
  }

  const PASSWORD = "review2026";
  const hashed = await bcrypt.hash(PASSWORD, 12);

  const sarah = await prisma.user.findUnique({
    where: { email: "demo.sarah@simplegrowth.local" },
  });
  if (!sarah) {
    console.error("demo.sarah user missing — local DB unfamiliar");
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: sarah.id },
    data: { password: hashed, emailVerified: new Date(), name: "Sarah (review)" },
  });

  // Find her project and flip to deployed
  if (sarah.organizationId) {
    const project = await prisma.websiteProject.findFirst({
      where: { organizationId: sarah.organizationId },
    });
    if (project) {
      await prisma.websiteProject.update({
        where: { id: project.id },
        data: {
          status: "deployed",
          deployedUrl: "https://sarahs-bistro.example.com",
          deploymentPlatform: "cloudflare",
          actualCompletion: new Date(),
        },
      });

      // Ensure sub is active website_pro so quota/CR flows work
      const sub = await prisma.subscription.findFirst({
        where: { organizationId: sarah.organizationId },
      });
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan: "website_pro",
            status: "active",
            processor: "manual",
            priceMonthly: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000),
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            organizationId: sarah.organizationId,
            plan: "website_pro",
            status: "active",
            processor: "manual",
            priceMonthly: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400 * 1000),
          },
        });
      }
    }
  }

  console.log("");
  console.log("=== Local review login ===");
  console.log("URL:      http://localhost:3000/login");
  console.log("Email:    demo.sarah@simplegrowth.local");
  console.log(`Password: ${PASSWORD}`);
  console.log("");
  console.log("Status now: deployed + active Pro plan — mirrors Jorge's setup.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
