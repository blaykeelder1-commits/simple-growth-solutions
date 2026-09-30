import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { bestStanding, isManagedPlan, standingOf } from "@/lib/billing/standing";

// GET /api/billing/subscriptions - List user's subscriptions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ success: true, subscriptions: [] });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["active", "trialing", "past_due", "expired", "awaiting_payment"] },
      },
      select: {
        id: true,
        plan: true,
        status: true,
        priceMonthly: true,
        currentPeriodEnd: true,
        trialEndDate: true,
        createdAt: true,
        processor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // The portal must never present a free or unpaid record as a paid, active plan —
    // each row and the account as a whole carry their real standing.
    const website = subscriptions.filter((s) => isManagedPlan(s.plan));
    const overall = bestStanding(website);
    return NextResponse.json({
      success: true,
      subscriptions: subscriptions.map((s) => ({ ...s, standing: standingOf(s) })),
      websiteStanding: website.length ? overall.standing : null,
      compUntil: overall.compUntil,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
