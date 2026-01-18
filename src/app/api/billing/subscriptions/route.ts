import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";

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
        status: { in: ["active", "trialing", "past_due"] },
      },
      select: {
        id: true,
        plan: true,
        status: true,
        priceMonthly: true,
        currentPeriodEnd: true,
        trialEndDate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, subscriptions });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
