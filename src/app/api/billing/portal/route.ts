import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { createPortalSession } from "@/lib/billing/stripe";

// POST /api/billing/portal - Create Stripe customer portal session
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
              where: { stripeCustomerId: { not: null } },
              take: 1,
            },
          },
        },
      },
    });

    const stripeCustomerId = user?.organization?.subscriptions[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { success: false, message: "No billing account found" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const portalSession = await createPortalSession({
      customerId: stripeCustomerId,
      returnUrl: `${baseUrl}/portal/billing`,
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
