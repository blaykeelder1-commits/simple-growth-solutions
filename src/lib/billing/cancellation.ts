import { prisma } from "@/lib/db/prisma";
import { apiLogger } from "@/lib/logger";
import { createApproval, type BillingTask } from "@/lib/approvals";
import { recordWorkEvent } from "@/lib/work/events";
import { bestStanding } from "@/lib/billing/standing";
import { cancelSubscription, getSgsSquareConfig, undoScheduledCancel } from "@/lib/billing/square";
import { PLAN_SCOPE, planDifference, websiteTier } from "@/lib/billing/plan-scope";
import { sendCancellationScheduledEmail, sendDowngradeScheduledEmail } from "@/lib/email";

/**
 * Self-serve cancellation with ONE save offer per customer, ever (Blayke, 2026-09-30).
 *
 * Research basis (2026-09-30 review): the only offer used is a downgrade to Managed — the
 * option with the best reported 12-month retention in the available (vendor, uncontrolled)
 * data. Cancel is always one click away next to the offer (California ARL §17602(e)(2) style),
 * the offer is made once per cancellation (Minnesota §325G.58 style), and cancellation takes
 * effect at the end of the paid period, undoable until then.
 */

export const CANCEL_REASONS = [
  { key: "too_expensive", label: "It costs more than it's worth to me right now" },
  { key: "not_using", label: "I'm not using it enough" },
  { key: "missing_feature", label: "It's missing something I need" },
  { key: "unhappy", label: "I'm not happy with the service or results" },
  { key: "switching", label: "I'm switching to another provider or doing it myself" },
  { key: "closing", label: "My business is closing or taking a break" },
  { key: "other", label: "Something else" },
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number]["key"];

/** Reasons a cheaper plan genuinely answers. For the rest, an offer would just be friction. */
const OFFER_REASONS = new Set<string>(["too_expensive", "not_using"]);

const ACTIVE = ["active", "trialing"];

async function activeSubscription(organizationId: string) {
  // The plan that actually grants service (paid, or an in-date comp). Oldest first so an
  // additional-site row (same plan key, created later) is never cancelled in place of the
  // customer's base plan.
  const subs = await prisma.subscription.findMany({
    where: { organizationId, status: { in: ACTIVE }, plan: { startsWith: "website_" } },
    orderBy: { createdAt: "asc" },
  });
  const granting = bestStanding(subs);
  return granting.standing === "unpaid" || !granting.sub ? null : subs.find((s) => s.id === granting.sub!.id) ?? null;
}

/** The cheaper plan we can offer: Pro/Premium → Managed (annual → annual). Null for Managed. */
export function downgradeTarget(plan: string): string | null {
  const tier = websiteTier(plan);
  if (tier !== "website_pro" && tier !== "website_premium") return null;
  return plan.endsWith("_annual") ? "website_managed_annual" : "website_managed";
}

function label(plan: string): string {
  const tier = websiteTier(plan);
  return tier ? PLAN_SCOPE[tier].label : plan;
}

export class CancelError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function cancelState(organizationId: string) {
  const [sub, org] = await Promise.all([
    activeSubscription(organizationId),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { saveOfferUsedAt: true } }),
  ]);
  if (!sub) return { subscription: null, reasons: CANCEL_REASONS, offer: null };
  const target = downgradeTarget(sub.plan);
  const offer =
    target && !org?.saveOfferUsedAt && !sub.cancelAt && !sub.pendingPlan
      ? {
          toPlan: target,
          toLabel: label(target),
          price: PLAN_SCOPE.website_managed.price,
          forReasons: Array.from(OFFER_REASONS),
          // Exactly what they'd give up and what they'd get — from the plan definitions.
          youLose: planDifference(sub.plan, target),
          youGet: PLAN_SCOPE.website_managed.includes.filter((i) => !i.startsWith("Managed hosting")).slice(0, 6),
        }
      : null;
  return {
    subscription: {
      plan: sub.plan,
      planLabel: label(sub.plan),
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAt: sub.cancelAt,
      pendingPlan: sub.pendingPlan,
      pendingPlanLabel: sub.pendingPlan ? label(sub.pendingPlan) : null,
    },
    reasons: CANCEL_REASONS,
    offer,
  };
}

async function orgName(organizationId: string) {
  return (await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }))?.name ?? "A customer";
}

async function task(organizationId: string, subscriptionId: string, title: string, t: BillingTask, detail: string) {
  await createApproval(
    {
      kind: "billing_task",
      // One ref per (subscription, task): a new task must never supersede a different open one.
      refId: `${subscriptionId}:${t.action}`,
      organizationId,
      title,
      draft: detail,
      agentNote: JSON.stringify(t),
    },
    "system"
  );
}

function day(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "now";
}

export async function scheduleCancel(organizationId: string, reason: string, comment: string | null) {
  if (!CANCEL_REASONS.some((r) => r.key === reason)) throw new CancelError("pick a reason");
  const sub = await activeSubscription(organizationId);
  if (!sub) throw new CancelError("no active subscription to cancel", 404);
  if (sub.cancelAt) return { cancelAt: sub.cancelAt, alreadyScheduled: true };

  const name = await orgName(organizationId);
  let cancelAt: Date = sub.currentPeriodEnd ?? new Date();
  const cfg = getSgsSquareConfig();
  if (sub.processor === "square" && sub.squareSubscriptionId && cfg) {
    try {
      const { canceledDate } = await cancelSubscription(cfg, sub.squareSubscriptionId);
      if (canceledDate) cancelAt = new Date(`${canceledDate}T23:59:59Z`);
    } catch (err) {
      // Never tell the customer it's done and leave Square charging them: Blayke finishes it.
      apiLogger.error({ err, subscriptionId: sub.id }, "Square cancel FAILED — billing task queued");
      await task(organizationId, sub.id, `${name} — cancel their Square subscription (API failed)`,
        { action: "cancel_fallback", subscriptionId: sub.id },
        `The customer cancelled in the portal but Square's cancel call failed. In Square, cancel subscription ${sub.squareSubscriptionId} at the end of the current period (${day(cancelAt)}), then approve this.`);
    }
  } else {
    await task(organizationId, sub.id, `${name} — end their plan on ${day(cancelAt)}`,
      { action: "cancel_manual", subscriptionId: sub.id },
      `This plan isn't billed through Square (${sub.processor}). The customer cancelled in the portal; it ends ${day(cancelAt)}. Approve once billing is stopped — that marks the subscription canceled.`);
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelRequestedAt: new Date(), cancelAt, cancelReason: reason, cancelComment: comment?.trim() || null },
  });
  // A customer who reached the offer step has had their one offer.
  if (downgradeTarget(sub.plan) && OFFER_REASONS.has(reason)) {
    await prisma.organization.updateMany({ where: { id: organizationId, saveOfferUsedAt: null }, data: { saveOfferUsedAt: new Date() } });
  }
  await recordWorkEvent({
    entityType: "support", entityId: organizationId, event: "cancel_requested", actor: "customer",
    note: `CANCELLATION (${label(sub.plan)}): ${reason}${comment?.trim() ? ` — "${comment.trim()}"` : ""}`,
  });
  await task(organizationId, sub.id, `${name} cancelled — ${CANCEL_REASONS.find((r) => r.key === reason)?.label}`,
    { action: "notice", subscriptionId: sub.id },
    `Heads-up: ${name} cancelled their ${label(sub.plan)} plan. It stays live until ${day(cancelAt)}.${comment?.trim() ? ` Their words: "${comment.trim()}".` : ""} If you want to reach out personally, now's the time. Approve this to acknowledge — you'll get a separate reminder to pause their site once the paid period ends.`);
  notify(organizationId, (email, first) => sendCancellationScheduledEmail(email, first, label(sub.plan), cancelAt));
  return { cancelAt, alreadyScheduled: false };
}

export async function undoCancel(organizationId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { organizationId, status: { in: ACTIVE }, cancelAt: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) throw new CancelError("nothing to undo", 404);
  if (sub.cancelAt && sub.cancelAt.getTime() < Date.now()) throw new CancelError("this cancellation already took effect", 409);
  const cfg = getSgsSquareConfig();
  if (sub.processor === "square" && sub.squareSubscriptionId && cfg) {
    try {
      await undoScheduledCancel(cfg, sub.squareSubscriptionId);
    } catch (err) {
      apiLogger.error({ err, subscriptionId: sub.id }, "Square undo-cancel FAILED — billing task queued");
      await task(organizationId, sub.id, `${await orgName(organizationId)} — undo their Square cancellation (API failed)`,
        { action: "undo_cancel_fallback", subscriptionId: sub.id },
        `The customer changed their mind in the portal, but Square's undo failed. In Square, remove the scheduled cancellation on ${sub.squareSubscriptionId}, then approve this.`);
    }
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelRequestedAt: null, cancelAt: null, cancelReason: null, cancelComment: null },
  });
  // The pending "end their plan" / heads-up tasks no longer apply.
  await prisma.approvalItem.updateMany({
    where: { kind: "billing_task", refId: { startsWith: `${sub.id}:` }, status: "awaiting", NOT: { refId: `${sub.id}:undo_cancel_fallback` } },
    data: { status: "superseded" },
  });
  await recordWorkEvent({ entityType: "support", entityId: organizationId, event: "cancel_undone", actor: "customer", note: "Customer kept their subscription." });
}

export async function acceptDowngrade(organizationId: string, reason: string, comment: string | null) {
  const state = await cancelState(organizationId);
  if (!state.offer || !state.subscription) throw new CancelError("this offer isn't available", 409);
  if (!OFFER_REASONS.has(reason)) throw new CancelError("this offer isn't available for that reason", 409);
  const sub = await activeSubscription(organizationId);
  if (!sub) throw new CancelError("no active subscription", 404);
  const name = await orgName(organizationId);
  const effective = sub.currentPeriodEnd;

  await prisma.$transaction([
    prisma.organization.update({ where: { id: organizationId }, data: { saveOfferUsedAt: new Date() } }),
    prisma.subscription.update({ where: { id: sub.id }, data: { pendingPlan: state.offer.toPlan } }),
  ]);
  await task(organizationId, sub.id, `${name} — switch to ${state.offer.toLabel} on ${day(effective)} (saved from cancelling)`,
    { action: "downgrade", subscriptionId: sub.id, toPlan: state.offer.toPlan },
    `${name} was cancelling (${reason}) and took the downgrade instead. In Square, swap subscription ${sub.squareSubscriptionId ?? "(not on Square)"} to ${state.offer.toLabel} starting at the next billing date (${day(effective)}). Approve once done — that switches their plan in SGS.`);
  await recordWorkEvent({
    entityType: "support", entityId: organizationId, event: "saved", actor: "customer",
    note: `SAVED by downgrade ${label(sub.plan)} → ${state.offer.toLabel}: ${reason}${comment?.trim() ? ` — "${comment.trim()}"` : ""}`,
  });
  const changes = planDifference(sub.plan, state.offer.toPlan);
  notify(organizationId, (email, first) => sendDowngradeScheduledEmail(email, first, label(sub.plan), state.offer!.toLabel, effective, changes));
}

/**
 * Called whenever the approval queue is read (the host watcher polls every minute): once a
 * cancellation's paid period has ended, queue ONE "pause their site" task. Idempotent.
 */
export async function ensureDuePauseTasks(): Promise<void> {
  const due = await prisma.subscription.findMany({
    where: { cancelAt: { lte: new Date() } },
    select: { id: true, organizationId: true, cancelAt: true },
    take: 20,
  });
  for (const s of due) {
    const exists = await prisma.approvalItem.findFirst({
      where: { kind: "billing_task", refId: `${s.id}:pause_site` },
      select: { id: true },
    });
    if (exists) continue;
    const name = await orgName(s.organizationId);
    await createApproval(
      {
        kind: "billing_task",
        refId: `${s.id}:pause_site`,
        organizationId: s.organizationId,
        title: `${name} — paid period ended ${day(s.cancelAt)}: pause their website`,
        draft: `Their cancellation took effect. Pause the site (Cloudflare) per the cancellation policy, then approve this. They can still ask for the $499 transfer.`,
        agentNote: JSON.stringify({ action: "pause_site", subscriptionId: s.id }),
      },
      "system"
    );
  }
}

/** Fire-and-forget customer email to the org's owner (first name). */
function notify(organizationId: string, send: (email: string, first: string) => Promise<unknown>) {
  prisma.user
    .findFirst({ where: { organizationId, role: "owner" }, select: { email: true, name: true } })
    .then((u) => (u?.email ? send(u.email, u.name?.trim().split(/\s+/)[0] || "there") : undefined))
    .catch((err) => apiLogger.error({ err, organizationId }, "Cancellation email FAILED"));
}
