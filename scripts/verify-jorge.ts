import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "wasterescuekc@gmail.com";

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        include: {
          subscriptions: true,
          websiteProjects: true,
        },
      },
    },
  });

  if (!user) {
    console.log("✗ User not found");
    return;
  }

  const org = user.organization;
  const sub = org?.subscriptions[0];
  const proj = org?.websiteProjects[0];

  console.log("USER");
  console.log("  id:           ", user.id);
  console.log("  email:        ", user.email);
  console.log("  name:         ", user.name);
  console.log("  role:         ", user.role);
  console.log("  emailVerified:", user.emailVerified);
  console.log("  organizationId:", user.organizationId);
  console.log("");
  console.log("ORGANIZATION");
  console.log("  id:                 ", org?.id);
  console.log("  name:               ", org?.name);
  console.log("  industry:           ", org?.industry);
  console.log("  subscriptionTier:   ", org?.subscriptionTier);
  console.log("  subscriptionStatus: ", org?.subscriptionStatus);
  console.log("  customerStage:      ", org?.customerStage);
  console.log("");
  console.log("SUBSCRIPTION");
  console.log("  id:                  ", sub?.id);
  console.log("  plan:                ", sub?.plan);
  console.log("  status:              ", sub?.status);
  console.log("  processor:           ", sub?.processor);
  console.log("  priceMonthly:        ", sub?.priceMonthly);
  console.log("  currentPeriodStart:  ", sub?.currentPeriodStart);
  console.log("  currentPeriodEnd:    ", sub?.currentPeriodEnd);
  console.log("");
  console.log("WEBSITE PROJECT");
  console.log("  id:                ", proj?.id);
  console.log("  projectName:       ", proj?.projectName);
  console.log("  projectType:       ", proj?.projectType);
  console.log("  status:            ", proj?.status);
  console.log("  existingUrl:       ", proj?.existingUrl);
  console.log("  deployedUrl:       ", proj?.deployedUrl);
  console.log("  deploymentPlatform:", proj?.deploymentPlatform);
  console.log("  actualCompletion:  ", proj?.actualCompletion);
  console.log("");

  const token = await prisma.verificationToken.findFirst({
    where: { identifier: `password_reset:${email}` },
  });
  console.log("RESET TOKEN");
  console.log("  exists:  ", !!token);
  console.log("  expires: ", token?.expires);
  console.log("");

  const audit = await prisma.auditLog.findFirst({
    where: { organizationId: org?.id, action: "customer_enlisted_manual" },
  });
  console.log("AUDIT LOG (customer_enlisted_manual)");
  console.log("  exists:    ", !!audit);
  console.log("  newValues: ", audit?.newValues);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
