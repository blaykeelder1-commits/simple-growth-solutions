// SLA helpers for change-request turnaround — the ONE place turnaround promises become
// due dates. Must match the pricing page: Managed 5 business days (same-day rush $49),
// Pro 24 hours on every request (rush free → same day), Premium same day on every request.
import { websiteTier } from "@/lib/billing/plan-scope";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/** Business clock (Blayke's default, 2026-09-30): Central time, Mon–Fri. */
export const BUSINESS_TZ = "America/Chicago";
/** Same-day cutoff: requests in by 2 pm Central are due by 6 pm Central that day. */
export const SAME_DAY_CUTOFF_HOUR = 14;
export const SAME_DAY_DUE_HOUR = 18;

/**
 * Add N business days (Mon-Fri) to a given date. Skips Saturdays + Sundays.
 * No timezone awareness — uses the date in whatever zone the input represents.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    result.setTime(result.getTime() + ONE_DAY_MS);
    const day = result.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

/** Wall-clock parts of `d` in the business time zone. */
function businessParts(d: Date): { y: number; m: number; day: number; hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: +get("year"), m: +get("month"), day: +get("day"), hour: +get("hour"), weekday };
}

/** The instant that is `hour`:00 business-time on the business-calendar date of `d`. */
function atBusinessHour(d: Date, hour: number): Date {
  const { y, m, day } = businessParts(d);
  // Start from that wall-clock time read as UTC, then correct by the zone's offset.
  const guess = new Date(Date.UTC(y, m - 1, day, hour));
  const offsetHours = businessParts(guess).hour - hour; // e.g. 18:00 UTC shows 13 in CDT → -5
  return new Date(guess.getTime() - offsetHours * ONE_HOUR_MS);
}

/**
 * "Same business day": by 6 pm Central when received by 2 pm Central on a weekday;
 * otherwise by 6 pm Central on the next business day.
 */
export function sameBusinessDayDue(now: Date): Date {
  const p = businessParts(now);
  const isWeekday = p.weekday >= 1 && p.weekday <= 5;
  if (isWeekday && p.hour < SAME_DAY_CUTOFF_HOUR) return atBusinessHour(now, SAME_DAY_DUE_HOUR);
  let next = new Date(now.getTime() + ONE_DAY_MS);
  while (![1, 2, 3, 4, 5].includes(businessParts(next).weekday)) next = new Date(next.getTime() + ONE_DAY_MS);
  return atBusinessHour(next, SAME_DAY_DUE_HOUR);
}

export type SlaKind = "same_day" | "24h" | "5_business_days";

/** Which turnaround applies. Annual plans get exactly what their monthly tier gets. */
export function slaKind(opts: { isRush: boolean; plan?: string | null }): SlaKind {
  const tier = websiteTier(opts.plan);
  if (tier === "website_premium" || opts.isRush) return "same_day";
  if (tier === "website_pro") return "24h";
  return "5_business_days";
}

export function computeSlaDueAt(opts: { isRush: boolean; plan?: string | null; now?: Date }): Date {
  const now = opts.now ?? new Date();
  const kind = slaKind(opts);
  if (kind === "same_day") return sameBusinessDayDue(now);
  if (kind === "24h") return new Date(now.getTime() + ONE_DAY_MS);
  return addBusinessDays(now, 5);
}

/** Customer-facing wording for the turnaround (emails, confirmations). */
export function slaLabel(opts: { isRush: boolean; plan?: string | null }): string {
  const kind = slaKind(opts);
  const tier = websiteTier(opts.plan);
  if (kind === "same_day") {
    return tier === "website_premium" ? "Same business day (Premium plan)" : "Same business day (rush)";
  }
  if (kind === "24h") return "Within 24 hours (Pro plan)";
  return "Within 5 business days";
}

/** Rush is $49 on Managed; free on Pro and Premium (pricing page FAQ). */
export function rushIsBilled(plan?: string | null): boolean {
  const tier = websiteTier(plan);
  return tier !== "website_pro" && tier !== "website_premium";
}

export const RUSH_FEE_CENTS = 4900;
