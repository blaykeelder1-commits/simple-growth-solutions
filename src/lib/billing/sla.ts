// SLA helpers for change-request turnaround.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

/**
 * Compute the SLA due date for a change request.
 * - Rush (or Pro plan): 24 hours
 * - Standard: 5 business days
 */
export function computeSlaDueAt(opts: {
  isRush: boolean;
  // When the customer is on Managed Pro, every ticket has a 24hr SLA — no
  // rush fee needed. The caller passes the active plan to apply this.
  plan?: string | null;
  now?: Date;
}): Date {
  const now = opts.now ?? new Date();
  if (opts.isRush || opts.plan === "website_pro") {
    return new Date(now.getTime() + ONE_DAY_MS);
  }
  return addBusinessDays(now, 5);
}

export const RUSH_FEE_CENTS = 4900;
