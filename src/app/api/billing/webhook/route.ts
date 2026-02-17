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
  if (!planConfig) {
    apiLogger.warn({ plan }, "Unknown plan in checkout session metadata");
    return;
  }

  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

  // Guard against duplicate webhook deliveries: if this Stripe subscription
  // already exists, update it instead of creating a duplicate row.
  if (stripeSubscriptionId) {
    const existing = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: "active" },
      });
      return;
    }
  }

  await prisma.subscription.create({
    data: {
      organizationId,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId,
      stripePriceId: planConfig.priceId ?? undefined,
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

  // current_period_start/end were removed from the Stripe SDK types in the
  // 2025-12-15.clover API version, but Stripe still sends them in webhook
  // payloads. Access them from the raw object safely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = subscription as any as Record<string, unknown>;
  const periodStart =
    typeof raw.current_period_start === "number"
      ? raw.current_period_start
      : undefined;
  const periodEnd =
    typeof raw.current_period_end === "number"
      ? raw.current_period_end
      : undefined;

  // canceled_at IS on the typed interface
  const canceledAt = subscription.canceled_at;

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
  // In Stripe API 2025-12-15.clover (SDK v20+), the subscription reference
  // moved from invoice.subscription to invoice.parent.subscription_details.subscription.
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) {
    // Fallback: check if the legacy top-level field is still present in the
    // raw webhook payload for backward compatibility.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = invoice as any as Record<string, unknown>;
    if (typeof raw.subscription === "string") return raw.subscription;
    if (
      raw.subscription &&
      typeof raw.subscription === "object" &&
      "id" in (raw.subscription as Record<string, unknown>)
    ) {
      return (raw.subscription as { id: string }).id;
    }
    return null;
  }
  if (typeof sub === "string") return sub;
  return sub.id;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active" },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    });
  }
}
