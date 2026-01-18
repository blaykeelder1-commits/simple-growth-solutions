import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { createCheckoutSession, PlanType } from "@/lib/billing/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["website_management", "cybersecurity", "chauffeur"]),
});

// POST /api/billing/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan } = checkoutSchema.parse(body);

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          include: {
            subscriptions: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 400 }
      );
    }

    // Check if already subscribed to this plan
    const existingSubscription = user.organization?.subscriptions.find(
      (s) => s.plan === plan && s.status === "active"
    );

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, message: "Already subscribed to this plan" },
        { status: 400 }
      );
    }

    // Get or find existing Stripe customer ID
    const stripeCustomerId = user.organization?.subscriptions.find(
      (s) => s.stripeCustomerId
    )?.stripeCustomerId;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      organizationId: user.organizationId,
      plan: plan as Exclude<PlanType, "cashflow_ai">,
      customerId: stripeCustomerId || undefined,
      successUrl: `${baseUrl}/portal/billing?success=true`,
      cancelUrl: `${baseUrl}/portal/billing?canceled=true`,
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid plan" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
