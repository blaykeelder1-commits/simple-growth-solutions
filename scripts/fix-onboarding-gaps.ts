// Closes the silent-failure gaps found while auditing Jorge's onboarding:
//
//  1. No admin user existed in prod → CR notification emails would no-op
//     silently. Provisions an admin row for the operator email (defaults to
//     blayke.elder1@gmail.com, override with ADMIN_EMAIL=...).
//
//  2. Jorge's subscription period was set to 365 days, but `website_pro`'s
//     `crsPerPeriod: 4` is meant to be 4/month. The CR-counting code uses
//     `currentPeriodStart..currentPeriodEnd` as its window, so the 1-year
//     period would have given him 4 CRs over the ENTIRE YEAR, not per month.
//     Rolls his period to a clean 30-day window starting today.
//
// Idempotent — safe to re-run. Also serves as the prototype "roll manual-sub
// periods" routine; can be triggered monthly via cron later.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "blayke.elder1@gmail.com";
const ADMIN_NAME = process.env.ADMIN_NAME || "Blayke Elder";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // ────────────────────────────────────────────────────────────
  // 1) Provision admin user (so CR notification emails actually land)
  // ────────────────────────────────────────────────────────────
  console.log("=== STEP 1: Ensure admin user exists ===");
  const placeholderPassword = crypto.randomBytes(24).toString("base64url");
  const hashed = await bcrypt.hash(placeholderPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "admin", emailVerified: now },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: hashed,
      role: "admin",
      emailVerified: now,
      authProvider: "email",
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (role=${admin.role}, id=${admin.id})`);

  // Issue a reset link so the admin can set their own password.
  await prisma.verificationToken.deleteMany({
    where: { identifier: `password_reset:${ADMIN_EMAIL}` },
  });
  const adminToken = crypto.randomBytes(32).toString("hex");
  const adminTokenExpires = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({
    data: {
      identifier: `password_reset:${ADMIN_EMAIL}`,
      token: adminToken,
      expires: adminTokenExpires,
    },
  });
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const adminResetUrl = `${baseUrl}/reset-password?token=${adminToken}`;
  console.log(`  ✓ Admin reset URL (valid 60 days): ${adminResetUrl}`);

  // Send the admin a welcome email too (only if Resend is configured).
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from =
      process.env.EMAIL_FROM ||
      "Simple Growth Solutions <noreply@simple-growth-solution.com>";
    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#2563eb;">Simple Growth Solutions — Admin Access</h1>
  <p>Hi ${ADMIN_NAME.split(" ")[0]},</p>
  <p>Your admin account is provisioned on the SGS production site. Set your password using the link below (valid 60 days):</p>
  <p><a href="${adminResetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;">Set Admin Password</a></p>
  <p>Once your password is set, sign in at <a href="${baseUrl}/login">${baseUrl}/login</a> and the <code>/admin</code> routes will be unlocked.</p>
  <p>You'll start receiving change-request notification emails as soon as Jorge (or any other customer) submits one.</p>
</body></html>`;
    const { error } = await resend.emails.send({
      from,
      to: [ADMIN_EMAIL],
      subject: "SGS admin access — set your password",
      html,
    });
    if (error) {
      console.warn(`  ⚠ Admin welcome email failed: ${error.message}`);
    } else {
      console.log(`  ✓ Admin welcome email sent to ${ADMIN_EMAIL}`);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 2) REMOVED 2026-09-30: this step re-rolled every "manual" (free) subscription to a
  // fresh 30 days, which kept Waste Rescue KC looking paid for months with nothing
  // collected. A comp now ends at its currentPeriodEnd and is never auto-extended
  // (src/lib/billing/standing.ts); extending one is an explicit admin decision.
  // ────────────────────────────────────────────────────────────
  const manualSubs: unknown[] = [];

  console.log("");
  console.log("==================================================");
  console.log("✓ Onboarding gaps closed");
  console.log("==================================================");
  console.log("  Admin user :", ADMIN_EMAIL);
  console.log("  Admin reset:", adminResetUrl);
  console.log(`  Manual subs rolled: ${manualSubs.length} (auto-roll removed)`);
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
