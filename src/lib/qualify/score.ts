/**
 * Lead fit scoring for the free website build. Deterministic on purpose: the same
 * answers always give the same result, and every point comes with a plain-English
 * reason Blayke sees on the lead. Andy recommends from this; Blayke decides.
 *
 * Contractors first (decision 2026-09-29). Scope-breakers — online checkout /
 * e-commerce — are outside the free build and get a quote path instead.
 */

export const TRADES = {
  plumbing: "Plumbing",
  hvac: "Heating & air",
  electrical: "Electrical",
  roofing: "Roofing",
  remodeling: "Remodeling / construction",
  junk_removal: "Junk removal / dumpsters",
  landscaping: "Landscaping / lawn care",
  cleaning: "Cleaning",
  other_service: "Another local service",
  restaurant: "Restaurant / food",
  retail_ecommerce: "Online store / retail",
  other: "Something else",
} as const;

export const DESIRED_ACTIONS = {
  call: "Call us",
  quote: "Request a quote",
  book: "Book an appointment",
  buy_online: "Buy products online",
  other: "Something else",
} as const;

export const LEAD_SOURCES = {
  referrals: "Word of mouth / referrals",
  google: "Google search / Google Maps",
  facebook: "Facebook or other social media",
  ads: "Paid ads",
  directories: "Angi, Yelp, Thumbtack or similar",
  none: "We don't get many yet",
} as const;

export type Trade = keyof typeof TRADES;
export type DesiredAction = keyof typeof DESIRED_ACTIONS;
export type LeadSourceAnswer = keyof typeof LEAD_SOURCES;
export type FitStatus = "fit" | "review" | "decline";

const CONTRACTOR_TRADES = new Set<Trade>([
  "plumbing", "hvac", "electrical", "roofing", "remodeling", "junk_removal", "landscaping", "cleaning",
]);

export interface QualifyInput {
  trade: Trade;
  desiredAction: DesiredAction;
  currentLeadSource: LeadSourceAnswer;
  readyThisWeek: boolean;
  hasWebsite: boolean;
  /** 0–100 from the free audit, when they had a site to scan. */
  siteScore?: number | null;
}

export interface FitResult {
  score: number;
  status: FitStatus;
  reasons: string[];
}

/** A fit needs this many points (of 8) AND a yes on readiness. */
export const FIT_THRESHOLD = 6;

export function scoreLead(i: QualifyInput): FitResult {
  if (i.trade === "retail_ecommerce" || i.desiredAction === "buy_online") {
    return {
      score: 0,
      status: "decline",
      reasons: ["Wants online checkout / an online store — outside the free build (quote instead)"],
    };
  }

  let score = 0;
  const reasons: string[] = [];

  if (CONTRACTOR_TRADES.has(i.trade)) {
    score += 3;
    reasons.push(`+3 contractor trade (${TRADES[i.trade]}) — our focus`);
  } else if (i.trade === "other_service" || i.trade === "restaurant") {
    score += 1;
    reasons.push(`+1 local business (${TRADES[i.trade]}), not a core trade yet`);
  } else {
    reasons.push("+0 trade unclear");
  }

  if (i.desiredAction === "call" || i.desiredAction === "quote" || i.desiredAction === "book") {
    score += 2;
    reasons.push(`+2 wants customers to ${DESIRED_ACTIONS[i.desiredAction].toLowerCase()} — what our sites are built for`);
  } else {
    reasons.push("+0 goal for the site unclear");
  }

  if (i.readyThisWeek) {
    score += 2;
    reasons.push("+2 can send info and approvals within a week");
  } else {
    reasons.push("+0 not ready to send info/approvals this week");
  }

  if (!i.hasWebsite) {
    score += 1;
    reasons.push("+1 no website yet");
  } else if (typeof i.siteScore === "number" && i.siteScore < 60) {
    score += 1;
    reasons.push(`+1 current site scores ${i.siteScore}/100 — clear room to improve`);
  }

  const status: FitStatus = score >= FIT_THRESHOLD && i.readyThisWeek ? "fit" : "review";
  return { score, status, reasons };
}
