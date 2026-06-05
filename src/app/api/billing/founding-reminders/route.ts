import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";
import {
  STANDARD_PRICE_CENTS,
  FOUNDING_INTRO_MONTHS,
  isWebsitePlan,
} from "@/lib/billing/founding";
import { sendFoundingStepUpEmail } from "@/lib/email/lifecycle-emails";

// POST /api/billing/founding-reminders
// Daily cron. Emails founding customers ~1 week before their intro rate reverts
// to standard pricing, so the step-up is never a surprise on their card.
// Protected by CRON_SECRET. Idempotent via Subscription.foundingReminderSentAt.

const REMIND_WITHIN_DAYS = 8; // send when the step-up is this many days out
const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Active founding subs that haven't had the heads-up yet.
    const subs = await prisma.subscription.findMany({
      where: {
        status: "active",
        promoCodeId: { not: null },
        foundingReminderSentAt: null,
      },
      include: {
        organization: {
          include: { users: { select: { email: true, name: true, role: true } } },
        },
      },
    });

    const now = new Date();
    let sent = 0;

    for (const sub of subs) {
      if (!isWebsitePlan(sub.plan)) continue;
      // The founding intro runs INTRO_MONTHS from activation; standard pricing
      // begins at that point. Anchor on the activation date.
      const anchor = sub.currentPeriodStart ?? sub.createdAt;
      const stepUpDate = addMonths(anchor, FOUNDING_INTRO_MONTHS);
      const daysUntil = (stepUpDate.getTime() - now.getTime()) / DAY_MS;

      // Send in the window leading up to the step-up. The small negative floor
      // tolerates a late/missed cron run so the reminder still goes out.
      if (daysUntil > REMIND_WITHIN_DAYS || daysUntil < -2) continue;

      const owner =
        sub.organization.users.find((u) => u.role === "owner") ??
        sub.organization.users[0];
      if (!owner?.email) continue;

      try {
        await sendFoundingStepUpEmail({
          email: owner.email,
          name: owner.name || "there",
          plan: sub.plan,
          standardCents: STANDARD_PRICE_CENTS[sub.plan],
          stepUpDateText: stepUpDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        });
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { foundingReminderSentAt: now },
        });
        sent++;
      } catch (err) {
        apiLogger.warn({ err, subscriptionId: sub.id }, "Founding step-up reminder failed");
      }
    }

    apiLogger.info({ scanned: subs.length, sent }, "Founding step-up reminders run");
    return NextResponse.json({ success: true, scanned: subs.length, sent });
  } catch (error) {
    apiLogger.error({ err: error }, "Founding reminders cron failed");
    return NextResponse.json({ success: false, message: "Failed" }, { status: 500 });
  }
}
