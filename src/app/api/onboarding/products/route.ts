import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const productsSchema = z.object({
  products: z.array(
    z.enum([
      // Website tiers
      "website_managed",
      "website_pro",
      "website_premium",
      // AR
      "cashflow_ai",
      "ar_proactive",
      // GEO tiers
      "geo_starter",
      "geo_pro",
      "geo_enterprise",
      // Bundles
      "starter_bundle",
      "growth_bundle",
      "full_suite",
      "enterprise_suite",
    ])
  ),
});

// Product pricing configuration
const productConfig: Record<string, { name: string; priceMonthly: number }> = {
  website_managed: { name: "Managed Website", priceMonthly: 4900 },
  website_pro: { name: "Managed Pro", priceMonthly: 7900 },
  website_premium: { name: "Managed Premium", priceMonthly: 12900 },
  cashflow_ai: { name: "AR Collection", priceMonthly: 0 }, // 8% success fee
  ar_proactive: { name: "Proactive AR", priceMonthly: 4900 },
  geo_starter: { name: "GEO Starter", priceMonthly: 7900 },
  geo_pro: { name: "GEO Pro", priceMonthly: 14900 },
  geo_enterprise: { name: "GEO Enterprise", priceMonthly: 24900 },
  starter_bundle: { name: "Starter Bundle", priceMonthly: 9900 },
  growth_bundle: { name: "Growth Bundle", priceMonthly: 17900 },
  full_suite: { name: "Full Suite", priceMonthly: 22900 },
  enterprise_suite: { name: "Enterprise Suite", priceMonthly: 29900 },
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
