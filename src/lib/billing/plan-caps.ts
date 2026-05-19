// Plan caps & retention mechanics — the rules that turn the funnel from a
// free-ride trap into a sustainable subscription business.
//
// Three layers:
//   1) Per-period change-request caps (so a single high-touch customer can't
//      sink the labor budget on a $49 plan).
//   2) Overage pricing (each CR over the cap costs $25; rush still costs $49).
//   3) Trial restrictions — during the 14-day Managed trial we cap CRs at 1
//      so the customer has to convert before iterating endlessly.
//
// All amounts in USD cents.

export interface PlanCap {
  crsPerPeriod: number;
  slaDays?: number;
  slaHours?: number;
  includesRush: boolean;
  label: string;
}

export const PLAN_CAPS: Record<string, PlanCap> = {
  // Free / no-plan: customers without an active managed sub can't open CRs at all.
  none: { crsPerPeriod: 0, slaDays: 0, includesRush: false, label: "No plan" },

  // 14-day Managed trial — exactly ONE feedback round before they have to pay.
  // This is the anti-loophole keystone: small companies can't extract a free
  // build + 8 free edits during the trial.
  trial: {
    crsPerPeriod: 1,
    slaDays: 5,
    includesRush: false,
    label: "Trial (14-day)",
  },

  website_managed: {
    crsPerPeriod: 2,
    slaDays: 5,
    includesRush: false,
    label: "Managed",
  },

  // Pro: 24-hour SLA on every ticket, rush is "always on", 4 CRs/mo.
  website_pro: {
    crsPerPeriod: 4,
    slaHours: 24,
    includesRush: true,
    label: "Managed Pro",
  },

  // Premium: same-day SLA, 10 CRs/mo, custom-feature credit quarterly.
  website_premium: {
    crsPerPeriod: 10,
    slaHours: 8, // same business day
    includesRush: true,
    label: "Managed Premium",
  },

  // Bundles inherit Pro caps for now; bundle-specific caps land later.
  starter_bundle: { crsPerPeriod: 2, slaDays: 5, includesRush: false, label: "Starter Bundle" },
  growth_bundle: { crsPerPeriod: 4, slaHours: 24, includesRush: true, label: "Growth Bundle" },
  full_suite: { crsPerPeriod: 10, slaHours: 8, includesRush: true, label: "Full Suite" },
  enterprise_suite: { crsPerPeriod: 25, slaHours: 4, includesRush: true, label: "Enterprise Suite" },
} as const;

export type PlanKey = keyof typeof PLAN_CAPS;

// Each CR over the included cap costs this much. Auto-billed via Square Payment Link.
export const OVERAGE_CR_FEE_CENTS = 2500;

// Source-code / asset transfer fee — anti-loophole for customers who try to
// take everything we built and self-host. Communicated up-front in the FAQ.
export const TRANSFER_FEE_CENTS = 49900;

/**
 * Resolve plan caps for an active subscription.
 * `subStatus` is the subscription status string (`active`, `trialing`, etc.).
 * `plan` is the plan key (e.g. `website_managed`).
 *
 * Returns the trial caps when the sub is in trialing state, regardless of
 * which plan they signed up for, since the customer hasn't paid yet.
 */
export function resolvePlanCaps(
  plan: string | null | undefined,
  subStatus: string | null | undefined
) {
  if (!plan || !subStatus) return PLAN_CAPS.none;
  if (subStatus === "trialing") return PLAN_CAPS.trial;
  if (subStatus !== "active") return PLAN_CAPS.none;
  return PLAN_CAPS[plan] ?? PLAN_CAPS.none;
}

/**
 * Auto-roll an active "manual" (comped) subscription whose period has expired.
 * Square/Stripe webhooks roll their own subs forward when a payment lands;
 * manual subs have no payment event, so without this they'd hard-cap at
 * `cap reached` forever after the first 30 days. Pass the prisma client so
 * the caller controls transactions; returns the (possibly rolled) sub.
 */
export async function rollManualPeriodIfExpired<
  T extends {
    id: string;
    status: string;
    processor: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  }
>(
  prisma: {
    subscription: { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> };
  },
  sub: T
): Promise<T> {
  const expired =
    sub.status === "active" &&
    sub.processor === "manual" &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd.getTime() < Date.now();
  if (!expired) return sub;
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { currentPeriodStart: start, currentPeriodEnd: end },
  });
  sub.currentPeriodStart = start;
  sub.currentPeriodEnd = end;
  return sub;
}

/**
 * Determine the current "billing period" window so we can count CRs against
 * the per-period cap.
 *
 * - Trialing subs: window = trialStartDate..trialEndDate (the whole 14 days).
 * - Active subs: window = currentPeriodStart..currentPeriodEnd (one billing month).
 * - Falls back to "last 30 days" if neither is set yet.
 */
export function getPeriodWindow(sub: {
  status: string;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): { from: Date; to: Date } {
  if (sub.status === "trialing" && sub.trialStartDate && sub.trialEndDate) {
    return { from: sub.trialStartDate, to: sub.trialEndDate };
  }
  if (sub.currentPeriodStart && sub.currentPeriodEnd) {
    return { from: sub.currentPeriodStart, to: sub.currentPeriodEnd };
  }
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}
