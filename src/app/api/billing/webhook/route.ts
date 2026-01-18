import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe, PLANS } from "@/lib/billing/stripe";

// Stripe webhook handler
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
  } catch {
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
  } catch {
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

  // Create subscription record
  await prisma.subscription.create({
    data: {
      organizationId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
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
    // Subscription might have been created via webhook before checkout complete
    return;
  }

  // Access period data from subscription - cast to any for version compatibility
  const subData = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    canceled_at?: number | null;
    status: string;
  };

  await prisma.subscription.update({
    where: { id: existingSub.id },
    data: {
      status: subscription.status,
      currentPeriodStart: subData.current_period_start
        ? new Date(subData.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: subData.current_period_end
        ? new Date(subData.current_period_end * 1000)
        : undefined,
      canceledAt: subData.canceled_at
        ? new Date(subData.canceled_at * 1000)
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

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Update subscription status if needed - cast for version compatibility
  const invoiceData = invoice as unknown as { subscription?: string | null };
  if (invoiceData.subscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoiceData.subscription },
      data: { status: "active" },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Cast for version compatibility
  const invoiceData = invoice as unknown as { subscription?: string | null };
  if (invoiceData.subscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoiceData.subscription },
      data: { status: "past_due" },
    });
  }
}
