import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";
import { recordWorkEvent } from "@/lib/work/events";
import {
  findUnpaidInvoice,
  getCard,
  getSgsSquareConfig,
  storeCardFromToken,
  updateSubscriptionCard,
  type CardSummary,
} from "@/lib/billing/square";

/**
 * Self-serve card on file (portal → Billing → Update card).
 *
 * GET  — the card Square bills each month, whether a renewal failed, and the payment
 *        page for any unpaid Square invoice, plus the public Web Payments SDK ids.
 * POST — { sourceId } from card.tokenize({ intent: "STORE" }): save the new card to the
 *        customer's Square profile and point every one of their live Square
 *        subscriptions at it. The card number never reaches our server — only Square's
 *        single-use token does.
 */

async function customerContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, organizationId: true },
  });
  if (!user?.organizationId) return null;
  const subs = await prisma.subscription.findMany({
    where: {
      organizationId: user.organizationId,
      processor: "square",
      status: { in: ["active", "trialing", "past_due"] },
      squareSubscriptionId: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });
  return { user, subs, base: subs[0] ?? null };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const cfg = getSgsSquareConfig();
  const ctx = await customerContext(session.user.id);
  if (!cfg || !cfg.applicationId || !ctx?.base?.squareCustomerId) {
    return NextResponse.json({ success: true, available: false });
  }

  let card: CardSummary | null = null;
  if (ctx.base.squareCardId) {
    card = await getCard(cfg, ctx.base.squareCardId).catch((err) => {
      apiLogger.warn({ err }, "Could not read card on file");
      return null;
    });
  }
  const paymentFailedAt = ctx.subs.map((s) => s.paymentFailedAt).find(Boolean) ?? null;
  const unpaidInvoice = await findUnpaidInvoice(cfg, ctx.base.squareCustomerId).catch((err) => {
    apiLogger.warn({ err }, "Could not search unpaid invoices");
    return null;
  });

  return NextResponse.json({
    success: true,
    available: true,
    sdk: { applicationId: cfg.applicationId, locationId: cfg.locationId, environment: cfg.environment },
    cardholderName: ctx.user.name ?? null,
    card: card ? { brand: card.brand, last4: card.last4, expMonth: card.expMonth, expYear: card.expYear } : null,
    paymentFailedAt,
    unpaidInvoice,
  });
}

const postSchema = z.object({ sourceId: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const cfg = getSgsSquareConfig();
  const ctx = await customerContext(session.user.id);
  if (!cfg || !ctx?.base?.squareCustomerId) {
    return NextResponse.json(
      { success: false, message: "There's no card-billed plan on this account yet. Start your plan in Billing first." },
      { status: 400 }
    );
  }

  let sourceId: string;
  try {
    ({ sourceId } = postSchema.parse(await req.json()));
  } catch {
    return NextResponse.json({ success: false, message: "Invalid card details" }, { status: 400 });
  }

  // Same token → same key, so a double click saves one card (Square's limit is 45 chars).
  const key = `cardupd-${createHash("sha256").update(sourceId).digest("hex").slice(0, 36)}`;
  let card: CardSummary;
  try {
    card = await storeCardFromToken(cfg, {
      sourceId,
      customerId: ctx.base.squareCustomerId,
      idempotencyKey: key,
      cardholderName: ctx.user.name ?? undefined,
    });
  } catch (err) {
    apiLogger.error({ err, organizationId: ctx.user.organizationId }, "Card update: Square refused the card");
    const declined = err instanceof Error && /CARD_DECLINED|VERIFICATION|INVALID_CARD|CVV|EXPIRATION/i.test(err.message);
    return NextResponse.json(
      {
        success: false,
        message: declined
          ? "Your bank declined that card. Please check the details or try a different card."
          : "We couldn't save that card. Please try again, or message us from Support.",
      },
      { status: 402 }
    );
  }

  // Every live subscription (base plan and any additional sites) bills the new card.
  const failed: string[] = [];
  for (const sub of ctx.subs) {
    try {
      await updateSubscriptionCard(cfg, sub.squareSubscriptionId!, card.id);
      await prisma.subscription.update({ where: { id: sub.id }, data: { squareCardId: card.id } });
    } catch (err) {
      failed.push(sub.id);
      apiLogger.error({ err, subscriptionId: sub.id }, "Card saved but subscription NOT switched to it");
    }
  }

  await recordWorkEvent({
    entityType: "support",
    entityId: ctx.user.organizationId!,
    event: failed.length ? "card_update_partial" : "card_updated",
    actor: "customer",
    note: `${card.brand ?? "card"} ending ${card.last4 ?? "????"}${failed.length ? ` — NOT applied to ${failed.length} subscription(s)` : ""}`,
  });

  if (failed.length) {
    return NextResponse.json(
      {
        success: false,
        message: "Your card was saved, but we couldn't switch your plan to it yet. We've been alerted and will finish it for you.",
      },
      { status: 502 }
    );
  }

  const unpaidInvoice = await findUnpaidInvoice(cfg, ctx.base.squareCustomerId).catch(() => null);
  return NextResponse.json({
    success: true,
    card: { brand: card.brand, last4: card.last4, expMonth: card.expMonth, expYear: card.expYear },
    unpaidInvoice,
  });
}
