import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { createPortalSession } from "@/lib/billing/stripe";

// POST /api/billing/portal - Redirect to billing management.
// Stripe customers get the Stripe Customer Portal.
// Square customers get inline subscription details (Square has no self-service portal).
export async function POST() {
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
      include: {
        organization: {
          include: {
            subscriptions: {
              where: {
                status: { in: ["active", "trialing", "past_due", "awaiting_payment"] },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!user?.organization?.subscriptions.length) {
      return NextResponse.json(
        { success: false, message: "No billing account found" },
        { status: 400 }
      );
    }

    // Check for a Stripe customer first (legacy path).
    const stripeSub = user.organization.subscriptions.find(
      (s) => s.stripeCustomerId
    );
    if (stripeSub?.stripeCustomerId) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const portalSession = await createPortalSession({
        customerId: stripeSub.stripeCustomerId,
        returnUrl: `${baseUrl}/portal/billing`,
      });
      return NextResponse.json({ success: true, url: portalSession.url });
    }

    // Square customers — no hosted portal exists. Return subscription details
    // so the billing page can render them inline with a contact-us fallback.
    const squareSub = user.organization.subscriptions.find(
      (s) => s.processor === "square"
    );
    if (squareSub) {
      return NextResponse.json({
        success: true,
        processor: "square",
        subscription: {
          id: squareSub.id,
          plan: squareSub.plan,
          status: squareSub.status,
          priceMonthly: squareSub.priceMonthly,
          currentPeriodEnd: squareSub.currentPeriodEnd,
        },
        message: "Square subscriptions are managed by our team. Email us at support@simple-growth-solution.com to make changes.",
      });
    }

    return NextResponse.json(
      { success: false, message: "No billing account found" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
