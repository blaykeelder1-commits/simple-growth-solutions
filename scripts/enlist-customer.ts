// One-shot enlistment for SGS's first real customer: Jorge Belcher / Waste Rescue KC.
//
// Provisions four DB rows so the customer portal is fully functional from
// second 1 — no signup / onboarding / project-intake friction. Pre-bakes the
// WebsiteProject as `status: deployed` since the site is already live at
// https://wasterescuekc.com (built outside the SGS funnel).
//
// Idempotent: re-running won't create duplicate rows. Safe to retry.
//
// Usage:
//   # 1. Make sure .env points at the SGS PROD Supabase project, not local
//   # 2. Run with the safety confirmation gate set:
//   CONFIRM=yes npx tsx scripts/enlist-customer.ts
//
// To run against staging / local without prod safety blocks, set
// ALLOW_LOCALHOST=yes (and your NEXTAUTH_URL can be localhost).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

// ============================================================
// CUSTOMER DETAILS (edit here if needed before running)
// ============================================================
const CUSTOMER = {
  email: "wasterescuekc@gmail.com",
  name: "Jorge Belcher",
  organizationName: "Waste Rescue KC",
  industry: "Services",
  plan: "website_pro" as const, // Managed Pro — 4 CRs/mo, 24h SLA
  priceMonthly: 0, // Comped
  websiteUrl: "https://wasterescuekc.com",
  // Site went live 2026-05-16. Leave as null to skip.
  actualCompletion: new Date("2026-05-16T00:00:00Z"),
  // CR-counting period for the subscription. Must be ~30 days so the
  // `crsPerPeriod` cap (4 for Pro) means "per month" — not "per year". Manual
  // subs don't get auto-rolled by a payment webhook, so `scripts/fix-
  // onboarding-gaps.ts` is the periodic roller (run monthly or as needed).
  subscriptionDurationDays: 30,
  // Password-reset token validity window. 60 days — comped onboarding is
  // friend-of-the-family pace; he shouldn't have to chase a renewed link.
  resetTokenDays: 60,
};

const FROM_EMAIL =
  process.env.EMAIL_FROM ||
  "Simple Growth Solutions <noreply@simple-growth-solution.com>";

// ============================================================

const prisma = new PrismaClient();

async function main() {
  preflight();

  const now = new Date();
  const subscriptionEnd = new Date(
    now.getTime() + CUSTOMER.subscriptionDurationDays * 24 * 60 * 60 * 1000
  );
  const resetTokenExpires = new Date(
    now.getTime() + CUSTOMER.resetTokenDays * 24 * 60 * 60 * 1000
  );

  // Generate a random 32-char password the user never sees. They set their
  // real password via the reset-token email we issue at the end.
  const placeholderPassword = crypto.randomBytes(24).toString("base64url");
  const hashedPassword = await bcrypt.hash(placeholderPassword, 12);

  const { user, organization, subscription, project } = await prisma.$transaction(
    async (tx) => {
      // 1) USER — upsert by email
      const user = await tx.user.upsert({
        where: { email: CUSTOMER.email },
        update: {
          name: CUSTOMER.name,
          role: "owner",
          emailVerified: now, // skip the email-verify gate
          authProvider: "email",
        },
        create: {
          email: CUSTOMER.email,
          name: CUSTOMER.name,
          password: hashedPassword,
          role: "owner",
          emailVerified: now,
          authProvider: "email",
        },
      });

      // 2) ORGANIZATION — find existing one this user belongs to, or create
      let organization = user.organizationId
        ? await tx.organization.findUnique({ where: { id: user.organizationId } })
        : null;

      if (!organization) {
        organization = await tx.organization.create({
          data: {
            name: CUSTOMER.organizationName,
            industry: CUSTOMER.industry,
            subscriptionTier: CUSTOMER.plan,
            subscriptionStatus: "active",
            customerStage: "website_managed",
            stageStartedAt: now,
          },
        });

        // 3) LINK USER → ORG
        await tx.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id, role: "owner" },
        });

        // 6) JOURNEY EVENT — only on first creation, no duplicates
        await tx.journeyEvent.create({
          data: {
            organizationId: organization.id,
            fromStage: "lead",
            toStage: "website_managed",
            triggeredBy: "manual_enlistment",
            metadata: JSON.stringify({
              reason:
                "Comped first customer — site pre-existed outside SGS funnel",
              enlistedBy: "Blayke",
              plan: CUSTOMER.plan,
            }),
          },
        });
      } else {
        // Bring an existing org in line with the comp configuration in case
        // someone tweaked it through the UI between runs.
        organization = await tx.organization.update({
          where: { id: organization.id },
          data: {
            name: CUSTOMER.organizationName,
            industry: CUSTOMER.industry,
            subscriptionTier: CUSTOMER.plan,
            subscriptionStatus: "active",
            customerStage: "website_managed",
          },
        });
      }

      // 4) SUBSCRIPTION — find any existing managed sub for this org, otherwise create
      let subscription = await tx.subscription.findFirst({
        where: { organizationId: organization.id, plan: CUSTOMER.plan },
      });

      if (!subscription) {
        subscription = await tx.subscription.create({
          data: {
            organizationId: organization.id,
            processor: "manual", // comp — not Square/Stripe-backed
            plan: CUSTOMER.plan,
            status: "active",
            priceMonthly: CUSTOMER.priceMonthly,
            currentPeriodStart: now,
            currentPeriodEnd: subscriptionEnd,
          },
        });
      } else {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            processor: "manual",
            status: "active",
            priceMonthly: CUSTOMER.priceMonthly,
            currentPeriodStart: subscription.currentPeriodStart ?? now,
            currentPeriodEnd: subscription.currentPeriodEnd ?? subscriptionEnd,
          },
        });
      }

      // 5) WEBSITE PROJECT — find the existing one for this domain, otherwise create
      let project = await tx.websiteProject.findFirst({
        where: {
          organizationId: organization.id,
          existingUrl: CUSTOMER.websiteUrl,
        },
      });

      if (!project) {
        project = await tx.websiteProject.create({
          data: {
            organizationId: organization.id,
            projectName: CUSTOMER.organizationName,
            projectType: "migration",
            existingUrl: CUSTOMER.websiteUrl,
            deployedUrl: CUSTOMER.websiteUrl,
            deploymentPlatform: "cloudflare",
            status: "deployed",
            isFreeuild: false, // (sic) — schema has the typo as `is_free_build` → `isFreeuild`
            actualCompletion: CUSTOMER.actualCompletion,
          },
        });
      } else {
        project = await tx.websiteProject.update({
          where: { id: project.id },
          data: {
            projectName: CUSTOMER.organizationName,
            projectType: "migration",
            deployedUrl: CUSTOMER.websiteUrl,
            deploymentPlatform: "cloudflare",
            status: "deployed",
            isFreeuild: false,
          },
        });
      }

      // 7) AUDIT LOG
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: "customer_enlisted_manual",
          entityType: "organization",
          entityId: organization.id,
          newValues: {
            plan: CUSTOMER.plan,
            priceMonthly: CUSTOMER.priceMonthly,
            processor: "manual",
            websiteUrl: CUSTOMER.websiteUrl,
            reason: "First comped customer — site built outside SGS funnel",
          },
        },
      });

      return { user, organization, subscription, project };
    }
  );

  // 8) PASSWORD-RESET TOKEN — issued outside the main txn since we want it to
  // survive even if subsequent steps fail. Replaces any existing token for
  // this user so re-runs always give a fresh link.
  await prisma.verificationToken.deleteMany({
    where: { identifier: `password_reset:${CUSTOMER.email}` },
  });
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `password_reset:${CUSTOMER.email}`,
      token,
      expires: resetTokenExpires,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const loginUrl = `${baseUrl}/login`;

  // 9) SEND WELCOME EMAIL with the password-reset link
  await sendWelcomeEmail({
    email: CUSTOMER.email,
    firstName: CUSTOMER.name.split(" ")[0],
    organizationName: CUSTOMER.organizationName,
    resetUrl,
    loginUrl,
    resetTokenDays: CUSTOMER.resetTokenDays,
  });

  // 10) DONE — print summary
  console.log("");
  console.log("==================================================");
  console.log("✓ ENLISTMENT SUCCESSFUL");
  console.log("==================================================");
  console.log(`  Customer:        ${CUSTOMER.name}`);
  console.log(`  Email:           ${CUSTOMER.email}`);
  console.log(`  Organization:    ${CUSTOMER.organizationName} (${organization.id})`);
  console.log(`  Plan:            ${subscription.plan} (status: ${subscription.status})`);
  console.log(`  Price:           $${(subscription.priceMonthly / 100).toFixed(2)}/mo (comped)`);
  console.log(`  Website Project: ${project.projectName} (${project.id}, ${project.status})`);
  console.log(`  Live Site:       ${project.deployedUrl}`);
  console.log("");
  console.log(`  Login URL:       ${loginUrl}`);
  console.log(`  Password reset:  emailed to ${CUSTOMER.email} (valid ${CUSTOMER.resetTokenDays} days)`);
  console.log(`  Reset link:      ${resetUrl}`);
  console.log("==================================================");
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function preflight() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("✗ DATABASE_URL is not set. Did .env load?");
    process.exit(1);
  }

  const nextAuthUrl = process.env.NEXTAUTH_URL || "";
  const isLocal =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    nextAuthUrl.includes("localhost");

  // Hide credentials from console output
  const dbHost = dbUrl.replace(/:[^:@/]+@/, ":****@");

  console.log("==================================================");
  console.log("Enlistment preflight");
  console.log("==================================================");
  console.log(`  DATABASE_URL:    ${dbHost}`);
  console.log(`  NEXTAUTH_URL:    ${nextAuthUrl || "(unset)"}`);
  console.log(`  Customer:        ${CUSTOMER.name} <${CUSTOMER.email}>`);
  console.log(`  Plan:            ${CUSTOMER.plan} (comped)`);
  console.log("==================================================");

  if (isLocal && process.env.ALLOW_LOCALHOST !== "yes") {
    console.error("");
    console.error("✗ Refusing to run: this looks like a local environment.");
    console.error("  If you really want to run against localhost, set ALLOW_LOCALHOST=yes");
    console.error("  Otherwise, point .env at the PROD Supabase DB and re-run.");
    process.exit(1);
  }

  if (process.env.CONFIRM !== "yes") {
    console.error("");
    console.error("✗ Refusing to run without confirmation.");
    console.error("  Re-run with CONFIRM=yes to proceed:");
    console.error("    CONFIRM=yes npx tsx scripts/enlist-customer.ts");
    process.exit(1);
  }

  if (!process.env.NEXTAUTH_URL) {
    console.error("");
    console.error("✗ NEXTAUTH_URL is not set. The password-reset link won't be usable.");
    console.error("  Set it to the production URL (e.g. https://simple-growth-solution.com)");
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("");
    console.warn("⚠ RESEND_API_KEY is not set — the welcome email will NOT be sent.");
    console.warn("  The reset URL will still be printed at the end so you can deliver it manually.");
    console.warn("");
  }
}

async function sendWelcomeEmail(args: {
  email: string;
  firstName: string;
  organizationName: string;
  resetUrl: string;
  loginUrl: string;
  resetTokenDays: number;
}) {
  if (!process.env.RESEND_API_KEY) {
    return; // already warned in preflight
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;margin-bottom:30px;">
    <h1 style="color:#2563eb;margin:0;">Simple Growth Solutions</h1>
    <p style="color:#6b7280;margin:5px 0 0 0;">Your customer portal is ready</p>
  </div>
  <h2 style="color:#1f2937;">Welcome, ${escapeHtml(args.firstName)}.</h2>
  <p>Your website <strong>${escapeHtml(args.organizationName)}</strong> is live, and we've set you up with a customer account on Simple Growth Solutions so you can request edits, track work, and see everything in one place.</p>
  <p>To get started, set your password:</p>
  <div style="text-align:center;margin:30px 0;">
    <a href="${escapeHtml(args.resetUrl)}" style="display:inline-block;background:linear-gradient(to right,#2563eb,#4f46e5);color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;">Set My Password</a>
  </div>
  <p style="font-size:14px;color:#4b5563;">This link is valid for ${args.resetTokenDays} days. Once you've set your password, sign in at:</p>
  <p style="font-size:14px;"><a href="${escapeHtml(args.loginUrl)}">${escapeHtml(args.loginUrl)}</a></p>
  <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:24px 0;">
    <p style="margin:0 0 8px 0;"><strong>How it works:</strong></p>
    <p style="margin:0;font-size:14px;color:#4b5563;">Inside your portal you'll see your <strong>${escapeHtml(args.organizationName)}</strong> project marked as <em>Deployed</em>. Click it, then use <strong>Submit Change Request</strong> any time you want something updated on the site — text, images, hours, pricing, anything. Same-day turnaround on rush jobs.</p>
  </div>
  <p>If you have any questions, just reply to this email.</p>
  <p>— Blayke<br>Simple Growth Solutions</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
  <p style="font-size:12px;color:#6b7280;">If the button doesn't work, paste this into your browser: ${escapeHtml(args.resetUrl)}</p>
</body></html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [args.email],
    subject: `Welcome to Simple Growth Solutions — set your password`,
    html,
  });

  if (error) {
    console.error("");
    console.error("⚠ Welcome email failed to send:", error.message);
    console.error("  The reset URL is printed below — deliver it to the customer manually.");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

main()
  .catch((err) => {
    console.error("");
    console.error("✗ Enlistment failed:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
