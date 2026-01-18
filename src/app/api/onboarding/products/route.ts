import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const productsSchema = z.object({
  products: z.array(
    z.enum(["website_management", "cashflow_ai", "cybersecurity", "chauffeur"])
  ),
});

// Product pricing configuration
const productConfig = {
  website_management: {
    name: "Website Management",
    priceMonthly: 7900, // $79.00 in cents
  },
  cashflow_ai: {
    name: "Cash Flow AI",
    priceMonthly: 0, // Success fee only
  },
  cybersecurity: {
    name: "Cybersecurity Shield",
    priceMonthly: 3900, // $39.00 in cents
  },
  chauffeur: {
    name: "Business Chauffeur",
    priceMonthly: 19900, // $199.00 in cents
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "Organization required. Please complete step 1 first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = productsSchema.parse(body);

    if (validatedData.products.length === 0) {
      return NextResponse.json({ success: true, subscriptions: [] });
    }

    // Create subscriptions for selected products
    const result = await prisma.$transaction(async (tx) => {
      const subscriptions = [];

      for (const productId of validatedData.products) {
        const config = productConfig[productId];

        // Check if subscription already exists
        const existing = await tx.subscription.findFirst({
          where: {
            organizationId: user.organizationId!,
            plan: productId,
          },
        });

        if (existing) {
          subscriptions.push(existing);
          continue;
        }

        // Create subscription (starts as trial)
        const subscription = await tx.subscription.create({
          data: {
            organizationId: user.organizationId!,
            plan: productId,
            status: "trialing",
            priceMonthly: config.priceMonthly,
            trialStartDate: new Date(),
            trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
          },
        });

        subscriptions.push(subscription);

        // Log the action
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            organizationId: user.organizationId,
            action: "subscription_created",
            entityType: "subscription",
            entityId: subscription.id,
            newValues: {
              plan: productId,
              status: "trialing",
            },
          },
        });
      }

      return subscriptions;
    });

    return NextResponse.json({
      success: true,
      subscriptions: result.map((sub) => ({
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        trialEndDate: sub.trialEndDate,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to set up products" },
      { status: 500 }
    );
  }
}
