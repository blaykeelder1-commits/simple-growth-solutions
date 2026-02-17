import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe, PLANS } from "@/lib/billing/stripe";
import { apiLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    apiLogger.warn({ err }, "Stripe webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    apiLogger.error({ err, eventType: event.type }, "Stripe webhook handler failed");
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const plan = session.metadata?.plan as keyof typeof PLANS;

  if (!organizationId || !plan) {
    return;
  }

  const planConfig = PLANS[plan];

  await prisma.subscription.create({
    data: {
      organizationId,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
      stripePriceId: planConfig.priceId || undefined,
      plan,
      status: "active",
      priceMonthly: planConfig.amount,
    },
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const existingSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existingSub) {
    return;
  }

  // Use type assertion for Stripe SDK version compatibility
  const sub = subscription as unknown as Record<string, unknown>;
  const periodStart = sub.current_period_start as number | undefined;
  const periodEnd = sub.current_period_end as number | undefined;
  const canceledAt = sub.canceled_at as number | null | undefined;

  await prisma.subscription.update({
    where: { id: existingSub.id },
    data: {
      status: subscription.status,
      currentPeriodStart: periodStart
        ? new Date(periodStart * 1000)
        : undefined,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000)
        : undefined,
      canceledAt: canceledAt
        ? new Date(canceledAt * 1000)
        : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as Record<string, unknown>;
  const sub = inv.subscription;
  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in (sub as Record<string, unknown>)) return (sub as { id: string }).id;
  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = await getInvoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active" },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = await getInvoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    });
  }
}
