import { prisma } from "@/lib/db/prisma";

/**
 * Is this customer actually entitled to managed work right now? One answer, used by
 * every gate (edit requests, Andy's pipeline, the portal banner, Blayke's billing
 * to-dos).
 *
 *  - paid   — billed by a real processor (Square / Stripe) and in good standing.
 *  - comp   — deliberately free ("manual"), but ONLY until its currentPeriodEnd. A comp
 *             never renews itself; extending one is an explicit admin decision.
 *  - unpaid — anything else: no plan, awaiting first payment, past due, canceled, or a
 *             comp whose end date has passed.
 *
 * Why this exists: Waste Rescue KC was set up 2026-05-19 as a $0 "manual" Managed Pro
 * with no end date. Every check treated status "active" as paid, the portal showed a
 * green "Active · $0.00/month · Next billing date", and the period silently re-rolled
 * every 30 days — so the customer believed he'd paid and we kept working, for months,
 * with nothing collected (found 2026-09-30).
 */
export type Standing = "paid" | "comp" | "unpaid";

export interface StandingSub {
  id: string;
  plan: string;
  status: string;
  processor: string;
  currentPeriodEnd: Date | null;
}

export interface StandingResult {
  standing: Standing;
  /** The subscription that grants it (paid/comp), else the most relevant one, if any. */
  sub: StandingSub | null;
  /** Comp end date (comp only). */
  compUntil: Date | null;
}

const PAID_PROCESSORS = new Set(["square", "stripe"]);
const RANK: Record<Standing, number> = { paid: 2, comp: 1, unpaid: 0 };

export function standingOf(sub: StandingSub, now: Date = new Date()): Standing {
  if (PAID_PROCESSORS.has(sub.processor)) {
    return sub.status === "active" || sub.status === "trialing" ? "paid" : "unpaid";
  }
  if (sub.processor === "manual") {
    return sub.status === "active" && sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() > now.getTime()
      ? "comp"
      : "unpaid";
  }
  return "unpaid";
}

/** Best standing across a set of subscriptions (paid beats comp beats unpaid). */
export function bestStanding(subs: StandingSub[], now: Date = new Date()): StandingResult {
  let best: StandingResult = { standing: "unpaid", sub: subs[0] ?? null, compUntil: null };
  for (const s of subs) {
    const st = standingOf(s, now);
    if (RANK[st] > RANK[best.standing]) {
      best = { standing: st, sub: s, compUntil: st === "comp" ? s.currentPeriodEnd : null };
    }
  }
  return best;
}

export const STANDING_SELECT = {
  id: true,
  plan: true,
  status: true,
  processor: true,
  currentPeriodEnd: true,
} as const;

/** Standing for an organization's website / managed plans. */
export async function orgStanding(organizationId: string, now: Date = new Date()): Promise<StandingResult> {
  const subs = await prisma.subscription.findMany({
    where: { organizationId, plan: { startsWith: "website_" } },
    select: STANDING_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return bestStanding(subs, now);
}

export const UNPAID_CUSTOMER_MESSAGE =
  "Your plan isn't active yet, so new website changes are paused. Start your plan in Billing to continue.";
