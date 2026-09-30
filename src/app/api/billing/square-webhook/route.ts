import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import {
  getSgsSquareConfig,
  verifyWebhookSignature,
  getPayment,
  createSubscription,
  createCardOnFile,
  getSubscription,
} from "@/lib/billing/square";
import { bestStanding, MANAGED_PLANS, STANDING_SELECT } from "@/lib/billing/standing";
import { createApproval } from "@/lib/approvals";
import {
  foundingPlanVariationId,
  isWebsitePlan,
  STANDARD_PRICE_CENTS,
  FOUNDING_INTRO_MONTHS,
} from "@/lib/billing/founding";
import {
  sendSubscriptionActivatedEmail,
  sendPaymentFailedEmail,
  sendNewPaidCustomerInternalEmail,
  sendProvisioningStuckInternalEmail,
} from "@/lib/email/lifecycle-emails";
import { apiLogger } from "@/lib/logger";

// Square webhook handler.
// Events we care about:
//   - payment.created / payment.updated → completes first-month payment for a
//     pending Subscription (provisions the recurring sub) OR fulfills a
//     OneOffCharge (rush fees, custom upcharges).
//   - subscription.updated → reflects status changes for active subs.
//   - invoice.payment_made → recurring monthly billing succeeded.
//
// Always returns 200 so Square doesn't retry indefinitely; per-event errors
// are logged and we'd reconcile via dashboard if needed.

export async function POST(req: NextRequest) {
  const cfg = getSgsSquareConfig();
  if (!cfg) {
    apiLogger.warn("Square webhook hit but Square not configured");
    return NextResponse.json({ received: false }, { status: 200 });
  }

  const rawBody = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-square-hmacsha256-signature");

  if (cfg.webhookKey && signature) {
    // Square signs over the full notification URL + body. Construct it from
    // the request and the configured public base URL.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const notificationUrl = `${baseUrl}/api/billing/square-webhook`;
    const ok = verifyWebhookSignature(cfg.webhookKey, notificationUrl, rawBody, signature);
    if (!ok) {
      apiLogger.warn("Square webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (cfg.webhookKey && !signature) {
    apiLogger.warn("Square webhook missing signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let event: SquareEvent;
  try {
    event = JSON.parse(rawBody) as SquareEvent;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment.created":
      case "payment.updated":
        await handlePaymentEvent(event);
        break;
      case "subscription.created":
      case "subscription.updated":
        await handleSubscriptionEvent(event);
        break;
      case "invoice.payment_made":
        await handleInvoicePaid(event);
        break;
      case "invoice.scheduled_charge_failed":
        await handleChargeFailed(event);
        break;
      default:
        // Quietly ignore unhandled events — common for Square's broad event set.
        break;
    }
  } catch (err) {
    // Every handler is idempotent (atomic claims, Square idempotency keys, set-once
    // fields), so let Square redeliver instead of dropping the event: a swallowed error
    // here is how a customer ends up paid-but-not-provisioned with nobody retrying.
    apiLogger.error(
      { err, eventType: event.type, eventId: event.event_id },
      "Square webhook handler failed — returning 500 so Square retries"
    );
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ============================================================
// Event types (minimal, only fields we use)
// ============================================================

interface SquareEvent {
  event_id?: string;
  type: string;
  data?: {
    type?: string;
    id?: string;
    object?: Record<string, unknown>;
  };
}

// ============================================================
// Handlers
// ============================================================

async function handlePaymentEvent(event: SquareEvent) {
  const cfg = getSgsSquareConfig();
  if (!cfg) return;

  const paymentObj = event.data?.object?.payment as
    | { id?: string; status?: string; order_id?: string; customer_id?: string }
    | undefined;
  const paymentId = paymentObj?.id || event.data?.id;
  if (!paymentId) return;

  // Re-fetch the full payment so we have card_details + final status.
  const payment = await getPayment(cfg, paymentId);
  if (payment.status !== "COMPLETED" && payment.status !== "APPROVED") {
    return;
  }

  // Two possible matches:
  //   1) A pending Subscription whose Payment Link's order_id matches → first-month payment
  //   2) A pending OneOffCharge whose order_id matches → rush fee or custom upcharge
  if (payment.orderId) {
    // Only the checkout whose ORDER was paid. Matching by customer (the old rule) could
    // activate a different, abandoned checkout — or treat a rush-fee payment as a first
    // month — and start a second recurring subscription.
    const subscription = await prisma.subscription.findFirst({
      where: { processor: "square", status: "awaiting_payment", squareOrderId: payment.orderId },
    });

    if (subscription) {
      // Already paying for a website plan? Never create a second recurring subscription
      // for the same customer: close this checkout and ask Blayke to refund it.
      const others = await prisma.subscription.findMany({
        where: {
          organizationId: subscription.organizationId,
          plan: { in: MANAGED_PLANS },
          id: { not: subscription.id },
        },
        select: STANDING_SELECT,
      });
      if (isWebsitePlan(subscription.plan) && bestStanding(others).standing === "paid") {
        const closed = await prisma.subscription.updateMany({
          where: { id: subscription.id, status: "awaiting_payment" },
          data: { status: "duplicate_refund_needed" },
        });
        if (closed.count === 1) {
          const org = await prisma.organization.findUnique({
            where: { id: subscription.organizationId },
            select: { name: true },
          });
          await createApproval(
            {
              kind: "billing_task",
              refId: `${subscription.id}:refund_duplicate`,
              organizationId: subscription.organizationId,
              title: `${org?.name ?? "A customer"} — paid twice: refund $${((payment.totalCents ?? 0) / 100).toFixed(2)}`,
              draft:
                `They already have a paid plan and just paid another checkout (Square payment ${payment.id}). ` +
                `No second subscription was created. Refund this payment in Square, then approve this.`,
              agentNote: JSON.stringify({ action: "notice", subscriptionId: subscription.id }),
            },
            "system"
          );
        }
        return;
      }
      // Provision the recurring Square Subscription against a saved card.
      // Payment Links capture the card for the first charge but do NOT persist a
      // reusable card, so payment.cardId is null here — store the card-on-file
      // explicitly before we can bill the subscription against it.
      let cardId = payment.cardId;
      if (!cardId && payment.customerId) {
        try {
          const saved = await createCardOnFile(cfg, {
            paymentId: payment.id,
            customerId: payment.customerId,
          });
          cardId = saved.id;
        } catch (err) {
          apiLogger.error(
            { err, paymentId: payment.id, subscriptionId: subscription.id },
            "Failed to store card-on-file after first payment"
          );
        }
      }

      // Founding subs (created with a promo code) bill against the founding
      // plan variation so the discounted price persists every month.
      const isFounding = !!subscription.promoCodeId;
      const planVariationId =
        isFounding && isWebsitePlan(subscription.plan)
          ? foundingPlanVariationId(subscription.plan)
          : pickPlanVariationId(subscription.plan);

      // LOUD FAIL: payment captured but we cannot provision (no stored card or
      // no plan variation). Never strand the customer silently behind a success
      // page — alert ops and leave the sub in awaiting_payment for recovery.
      if (!cardId || !planVariationId) {
        await alertProvisioningStuck(
          subscription,
          payment,
          !cardId ? "card_not_stored" : "missing_plan_variation"
        );
        return;
      }

      try {
        // The checkout payment link already collected month 1 and saved the
        // card, so the recurring subscription must start one month out —
        // otherwise Square would bill the first cycle again immediately
        // (double-charge). For founding subs this also means the subscription's
        // founding phase covers the remaining intro months; month 1 (the link)
        // is the first founding month.
        const sub = await createSubscription(cfg, {
          customerId: payment.customerId!,
          cardId,
          planVariationId,
          startDate: nextPeriodStart(subscription.plan).toISOString().slice(0, 10),
          // Stable key so duplicate payment events (created + updated + retries)
          // return the SAME Square subscription instead of creating duplicates.
          idempotencyKey: `sub-${subscription.id}`,
        });

        // Atomically claim the activation: only the FIRST delivery flips
        // awaiting_payment → active. Duplicate deliveries get count 0 and bail
        // out before re-running the journey update and (critically) re-sending
        // the welcome + internal emails.
        const claimed = await prisma.subscription.updateMany({
          where: { id: subscription.id, status: "awaiting_payment" },
          data: {
            status: "active",
            squareCardId: cardId,
            squareSubscriptionId: sub.id,
            squarePlanVariationId: planVariationId,
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextPeriodStart(subscription.plan),
          },
        });
        if (claimed.count === 0) {
          // Already activated by a concurrent/duplicate event — Square deduped
          // the subscription via the idempotency key, so just stop here.
          return;
        }

        // They've paid: any "no paid plan" to-do for them is now stale.
        await prisma.approvalItem
          .updateMany({
            where: {
              kind: "billing_task",
              status: "awaiting",
              refId: { startsWith: `${subscription.organizationId}:unpaid:` },
            },
            data: { status: "superseded" },
          })
          .catch((err) => apiLogger.error({ err }, "Could not clear stale unpaid to-dos"));

        // Count the founding-code redemption now that the sub is live. Bounded
        // by maxRedemptions at validation time; this is the authoritative tally.
        if (subscription.promoCodeId) {
          await prisma.promoCode
            .update({
              where: { id: subscription.promoCodeId },
              data: { redeemedCount: { increment: 1 } },
            })
            .catch((err) =>
              apiLogger.warn(
                { err, promoCodeId: subscription.promoCodeId },
                "Subscription activated but promo redemption count failed to increment"
              )
            );
        }

        // Advance journey to managed.
        await prisma.journeyEvent.create({
          data: {
            organizationId: subscription.organizationId,
            fromStage: "website_build",
            toStage: "website_managed",
            triggeredBy: "subscription",
            metadata: JSON.stringify({ subscriptionId: subscription.id, plan: subscription.plan }),
          },
        }).catch((err) =>
          apiLogger.warn(
            { err, organizationId: subscription.organizationId },
            "Subscription activated but journey event failed to record"
          )
        );

        await prisma.organization.update({
          where: { id: subscription.organizationId },
          data: { customerStage: "website_managed" },
        }).catch((err) =>
          apiLogger.warn(
            { err, organizationId: subscription.organizationId },
            "Subscription activated but customerStage failed to advance"
          )
        );

        // Payment confirmation + welcome to the customer, plus an internal
        // "new paying customer" alert to the Snak Group ops inbox.
        // Non-blocking: a mail hiccup must never fail the webhook.
        try {
          const owner =
            (await prisma.user.findFirst({
              where: { organizationId: subscription.organizationId, role: "owner" },
              select: { email: true, name: true },
            })) ||
            (await prisma.user.findFirst({
              where: { organizationId: subscription.organizationId },
              select: { email: true, name: true },
            }));

          const org = await prisma.organization.findUnique({
            where: { id: subscription.organizationId },
            select: { name: true },
          });

          const liveProject = await prisma.websiteProject.findFirst({
            where: { organizationId: subscription.organizationId, deployedUrl: { not: null } },
            select: { deployedUrl: true },
            orderBy: { createdAt: "desc" },
          });

          const founding = subscription.promoCodeId && isWebsitePlan(subscription.plan)
            ? {
                introCents: subscription.priceMonthly,
                introMonths: FOUNDING_INTRO_MONTHS,
                standardCents: STANDARD_PRICE_CENTS[subscription.plan],
              }
            : null;

          // Customer-facing confirmation (only if we have their email).
          if (owner?.email) {
            await sendSubscriptionActivatedEmail({
              email: owner.email,
              name: owner.name || "there",
              plan: subscription.plan,
              founding,
              liveUrl: liveProject?.deployedUrl ?? null,
            });
          }

          // Internal ops alert → Snak Group inbox. Fires on every new paying
          // customer regardless of whether the owner email resolved.
          await sendNewPaidCustomerInternalEmail({
            plan: subscription.plan,
            priceCents: subscription.priceMonthly,
            founding: !!founding,
            customerName: owner?.name || "Unknown",
            customerEmail: owner?.email || "unknown",
            organizationName: org?.name ?? null,
            liveUrl: liveProject?.deployedUrl ?? null,
          });
        } catch (mailErr) {
          apiLogger.warn({ err: mailErr }, "Subscription activated but notification email failed");
        }
      } catch (err) {
        apiLogger.error({ err }, "Failed to provision Square subscription after first payment");
        await alertProvisioningStuck(subscription, payment, "square_subscription_error");
      }
      return;
    }

    // OneOffCharge path (rush fees, upcharges) — match by squareOrderId.
    const charge = await prisma.oneOffCharge.findFirst({
      where: {
        squareOrderId: payment.orderId,
        status: "pending",
      },
    });
    if (charge) {
      await prisma.oneOffCharge.update({
        where: { id: charge.id },
        data: {
          status: "paid",
          squarePaymentId: payment.id,
          paidAt: new Date(),
        },
      });
      // If this charge was a rush fee for a change request, transition the
      // ticket out of awaiting_payment so the admin queue picks it up.
      if (charge.changeRequestId) {
        await prisma.changeRequest.update({
          where: { id: charge.changeRequestId },
          data: { status: "pending" },
        }).catch((err) =>
          apiLogger.warn(
            { err, changeRequestId: charge.changeRequestId },
            "Rush fee paid but change request failed to move out of awaiting_payment"
          )
        );
      }
    }
  }
}

// Anti-silent-failure backstop: a first payment landed but we couldn't turn it
// into an active subscription. Log it AND email ops so the paid-but-stranded
// customer gets recovered instead of sitting behind a "success" page forever.
async function alertProvisioningStuck(
  subscription: {
    id: string;
    organizationId: string;
    plan: string;
    priceMonthly: number;
  },
  payment: { id: string; totalCents?: number },
  reason: string
) {
  apiLogger.error(
    { subscriptionId: subscription.id, paymentId: payment.id, reason },
    "First payment captured but subscription could NOT be provisioned"
  );
  try {
    const owner =
      (await prisma.user.findFirst({
        where: { organizationId: subscription.organizationId, role: "owner" },
        select: { email: true },
      })) ||
      (await prisma.user.findFirst({
        where: { organizationId: subscription.organizationId },
        select: { email: true },
      }));
    const org = await prisma.organization.findUnique({
      where: { id: subscription.organizationId },
      select: { name: true },
    });
    await sendProvisioningStuckInternalEmail({
      reason,
      plan: subscription.plan,
      amountCents: payment.totalCents ?? subscription.priceMonthly,
      paymentId: payment.id,
      customerEmail: owner?.email ?? null,
      organizationName: org?.name ?? null,
    });
  } catch (mailErr) {
    apiLogger.error({ err: mailErr }, "Failed to send provisioning-stuck alert");
  }
}

async function handleSubscriptionEvent(event: SquareEvent) {
  const subObj = event.data?.object?.subscription as
    | { id?: string; status?: string; canceled_date?: string; charged_through_date?: string }
    | undefined;
  const subscriptionId = subObj?.id || event.data?.id;
  if (!subscriptionId || !subObj?.status) return;

  const local = await prisma.subscription.findFirst({
    where: { squareSubscriptionId: subscriptionId },
  });
  if (!local) return;

  const status = mapSquareSubscriptionStatus(subObj.status);
  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      status,
      ...(status === "canceled" ? { canceledAt: new Date() } : {}),
      ...(subObj.charged_through_date
        ? { currentPeriodEnd: new Date(subObj.charged_through_date) }
        : {}),
    },
  });

  // Dunning: a recurring charge failed (Square PAUSED → past_due). Email the
  // owner to update their card — only on the transition in, so repeated
  // past_due events don't spam them. Non-blocking.
  if (status === "past_due" && local.status !== "past_due") {
    try {
      const owner =
        (await prisma.user.findFirst({
          where: { organizationId: local.organizationId, role: "owner" },
          select: { email: true, name: true },
        })) ||
        (await prisma.user.findFirst({
          where: { organizationId: local.organizationId },
          select: { email: true, name: true },
        }));
      if (owner?.email) {
        await sendPaymentFailedEmail({
          email: owner.email,
          name: owner.name || "there",
          plan: local.plan,
        });
      }
    } catch (mailErr) {
      apiLogger.warn({ err: mailErr }, "Failed to send payment-failed email");
    }
  }
}

/** The local row for the Square subscription an invoice event belongs to, if any. */
async function localForInvoice(event: SquareEvent) {
  const invoice = event.data?.object?.invoice as { id?: string; subscription_id?: string } | undefined;
  if (!invoice?.subscription_id) return null;
  const local = await prisma.subscription.findFirst({ where: { squareSubscriptionId: invoice.subscription_id } });
  return local ? { local, squareSubscriptionId: invoice.subscription_id } : null;
}

async function handleInvoicePaid(event: SquareEvent) {
  // A renewal was paid. Square doesn't document that subscription.updated fires on every
  // renewal, so read the subscription itself: move the paid-through date forward (else
  // the "renewal missing" check raises false alarms) and clear any failed-charge mark.
  const found = await localForInvoice(event);
  if (!found) return;
  const cfg = getSgsSquareConfig();
  if (!cfg) return;
  const remote = await getSubscription(cfg, found.squareSubscriptionId);
  await prisma.subscription.update({
    where: { id: found.local.id },
    data: {
      paymentFailedAt: null,
      status: mapSquareSubscriptionStatus(remote.status),
      ...(remote.chargedThroughDate ? { currentPeriodEnd: new Date(remote.chargedThroughDate) } : {}),
    },
  });
}

async function handleChargeFailed(event: SquareEvent) {
  // A renewal charge was declined. Square keeps the subscription ACTIVE and emails the
  // customer its invoice; we mark the failure (7 days of grace, see standing.ts), ask the
  // customer to update their card, and tell Blayke once per failure.
  const found = await localForInvoice(event);
  if (!found) return;
  const { local } = found;
  const marked = await prisma.subscription.updateMany({
    where: { id: local.id, paymentFailedAt: null },
    data: { paymentFailedAt: new Date() },
  });
  if (marked.count === 0) return; // this failure was already handled

  const owner =
    (await prisma.user.findFirst({
      where: { organizationId: local.organizationId, role: "owner" },
      select: { email: true, name: true },
    })) ||
    (await prisma.user.findFirst({ where: { organizationId: local.organizationId }, select: { email: true, name: true } }));
  if (owner?.email) {
    await sendPaymentFailedEmail({ email: owner.email, name: owner.name || "there", plan: local.plan }).catch((err) =>
      apiLogger.error({ err, subscriptionId: local.id }, "Payment-failed email FAILED")
    );
  }
  const org = await prisma.organization.findUnique({ where: { id: local.organizationId }, select: { name: true } });
  await createApproval(
    {
      kind: "billing_task",
      refId: `${local.id}:charge_failed:${new Date().toISOString().slice(0, 10)}`,
      organizationId: local.organizationId,
      title: `${org?.name ?? "A customer"} — card declined on renewal`,
      draft:
        `Square could not charge their card for ${local.plan}. Square emailed them the invoice and we asked them to ` +
        `update their card. Work continues for 7 days, then pauses automatically until they pay.`,
      agentNote: JSON.stringify({ action: "notice", subscriptionId: local.id }),
    },
    "system"
  );
}

// ============================================================
// Helpers
// ============================================================

function pickPlanVariationId(plan: string): string | null {
  const cfg = getSgsSquareConfig();
  if (!cfg) return null;
  if (plan === "website_managed") return cfg.planIds.website_managed;
  if (plan === "website_pro") return cfg.planIds.website_pro;
  if (plan === "website_premium") return cfg.planIds.website_premium;
  if (plan === "website_managed_annual") return cfg.planIds.website_managed_annual;
  if (plan === "website_pro_annual") return cfg.planIds.website_pro_annual;
  if (plan === "website_premium_annual") return cfg.planIds.website_premium_annual;
  return null;
}

// The recurring Square subscription must start one full billing period out,
// because the checkout payment link already collected period 1 (and saved the
// card). For annual plans that's a year, otherwise a month — getting this wrong
// double-charges the customer immediately.
function nextPeriodStart(plan: string): Date {
  const d = new Date();
  if (plan.endsWith("_annual")) d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function mapSquareSubscriptionStatus(status: string): string {
  // Square statuses: ACTIVE, CANCELED, DEACTIVATED, PAUSED, PENDING.
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "active";
    // PENDING = the recurring subscription is scheduled but hasn't hit its first
    // billing date yet. In our flow we deliberately future-date the start by one
    // period (the payment link already collected and the customer paid for
    // month 1), so PENDING means "paid and entitled now, recurring starts next
    // cycle." Treat it as active so the customer isn't locked out for a month.
    case "PENDING":
      return "active";
    case "PAUSED":
      return "past_due";
    case "CANCELED":
    case "DEACTIVATED":
      return "canceled";
    default:
      return status.toLowerCase();
  }
}
