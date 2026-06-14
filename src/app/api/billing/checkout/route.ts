import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { createCheckoutSession, type CheckoutPlanType, PLANS } from "@/lib/billing/stripe";
import {
  getSgsSquareConfig,
  findOrCreateCustomer,
  createPaymentLink,
} from "@/lib/billing/square";
import { validatePromoCode } from "@/lib/billing/founding";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const checkoutSchema = z.object({
  promoCode: z.string().trim().min(1).max(40).optional(),
  plan: z.enum([
    // $1 Square connectivity test
    "website_test",
    // Website tiers
    "website_managed",
    "website_pro",
    "website_premium",
    // Cash Flow AI (only pro has a Stripe price)
    "cashflow_pro",
    // GEO / Business Chauffeur tiers
    "geo_starter",
    "geo_pro",
    "geo_enterprise",
    // Bundles
    "starter_bundle",
    "growth_bundle",
    "full_suite",
    "enterprise_suite",
  ]),
});

// Plans that route through Square (the customer-facing front-half of SGS).
// All other plans still go through the legacy Stripe path.
const SQUARE_PLAN_KEYS = new Set<string>([
  "website_test",
  "website_managed",
  "website_pro",
  "website_premium",
]);

// POST /api/billing/checkout - Create a hosted checkout session.
// Routes to Square for front-half website plans, Stripe for everything else.
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
    const { plan, promoCode } = checkoutSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: { include: { subscriptions: true } },
      },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json(
        { success: false, message: "No organization found" },
        { status: 400 }
      );
    }

    const existing = user.organization.subscriptions.find(
      (s) => s.plan === plan && s.status === "active"
    );
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Already subscribed to this plan" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // ── Square path (website management front-half) ─────────────────────
    if (SQUARE_PLAN_KEYS.has(plan)) {
      const cfg = getSgsSquareConfig();
      if (!cfg) {
        apiLogger.error("Square not configured but a Square plan was requested");
        return NextResponse.json(
          { success: false, message: "Billing is not configured" },
          { status: 500 }
        );
      }

      const planConfig = PLANS[plan as keyof typeof PLANS];
      if (!planConfig || !("amount" in planConfig)) {
        return NextResponse.json(
          { success: false, message: "Invalid plan" },
          { status: 400 }
        );
      }

      // Optional founding-rate promo code. When valid, the customer pays the
      // founding price now and the webhook provisions the recurring sub against
      // the founding Square plan variation so the discount persists.
      let amountCents: number = planConfig.amount;
      let promoCodeId: string | null = null;
      let descriptionSuffix = "first month";
      if (promoCode) {
        const result = await validatePromoCode(prisma, promoCode, plan);
        if (!result.ok) {
          return NextResponse.json(
            { success: false, message: result.error },
            { status: 400 }
          );
        }
        amountCents = result.foundingCents;
        promoCodeId = result.promo.id;
        descriptionSuffix = "first month (founding rate)";
      }

      const customer = await findOrCreateCustomer(
        cfg,
        user.email,
        user.name || undefined
      );

      // Capture the customer's card via Payment Link for the first month.
      // The webhook will then provision a recurring Square Subscription
      // against the saved card.
      const link = await createPaymentLink(cfg, {
        amountCents,
        description: `${planConfig.name} — ${descriptionSuffix}`,
        redirectUrl: `${baseUrl}/portal/billing?success=true&plan=${plan}`,
        buyerEmail: user.email,
        customerId: customer.id,
        metadata: {
          organizationId: user.organizationId,
          plan,
          purpose: "subscription_first_month",
        },
      });

      // Persist a "pending" Subscription so the webhook can find it.
      await prisma.subscription.create({
        data: {
          organizationId: user.organizationId,
          processor: "square",
          plan,
          status: "awaiting_payment",
          priceMonthly: amountCents,
          promoCodeId,
          squareCustomerId: customer.id,
          squarePaymentLinkId: link.id,
          squarePaymentLinkUrl: link.url,
        },
      });

      return NextResponse.json({ success: true, url: link.url });
    }

    // ── Legacy Stripe path (back-half products) ─────────────────────────
    // We're Square-only right now; Stripe isn't configured in production. Fail
    // with a clear message instead of a 500 if a Stripe-routed plan is hit.
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: "This add-on isn't available yet — check back soon." },
        { status: 400 }
      );
    }

    const stripeCustomerId = user.organization.subscriptions.find(
      (s) => s.stripeCustomerId
    )?.stripeCustomerId;

    const checkoutSession = await createCheckoutSession({
      organizationId: user.organizationId,
      plan: plan as CheckoutPlanType,
      customerId: stripeCustomerId || undefined,
      successUrl: `${baseUrl}/portal/billing?success=true`,
      cancelUrl: `${baseUrl}/portal/billing?canceled=true`,
    });

    return NextResponse.json({ success: true, url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid plan" },
        { status: 400 }
      );
    }
    apiLogger.error({ err: error }, "Checkout failed");
    return NextResponse.json(
      { success: false, message: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
