import { createHash } from "crypto";

/**
 * The 3-pass skeptical review gate (Blayke, 2026-09-29: "critical overview and
 * skeptical review of the work … at least 3 times … so multiple mistakes are not
 * being leaked").
 *
 * Andy's review tool runs three INDEPENDENT reviewers (fresh context each), one per
 * lens below, and loops fix → re-review until all three pass. SGS then refuses any
 * customer-facing submission from Andy that does not carry three passing reviews of
 * THAT EXACT text (bound by hash), and refuses customer text with internal jargon no
 * matter what the reviewers said.
 */

export const REVIEW_LENSES = ["requirement", "skeptic", "customer"] as const;
export type ReviewLens = (typeof REVIEW_LENSES)[number];

export interface ReviewPass {
  lens: ReviewLens;
  verdict: "pass" | "fail";
  findings: string[];
}

export interface ReviewRecord {
  subjectHash: string; // sha256 of the exact text that was reviewed
  rounds: number; // fix → re-review rounds it took (1 = passed first time)
  passes: ReviewPass[];
}

export function subjectHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/** Null when the record proves three passing reviews of `subject`; else why not. */
export function validateReview(record: unknown, subject: string): string | null {
  if (!record || typeof record !== "object") {
    return "missing review — run the 3-pass review (review-sgs.ts) and submit its record";
  }
  const r = record as Partial<ReviewRecord>;
  if (r.subjectHash !== subjectHash(subject)) {
    return "the review is for different text than what was submitted — review the final version";
  }
  const passes = Array.isArray(r.passes) ? r.passes : [];
  for (const lens of REVIEW_LENSES) {
    const p = passes.find((x) => x && x.lens === lens);
    if (!p) return `review is missing the "${lens}" pass`;
    if (p.verdict !== "pass") return `the "${lens}" review did not pass: ${(p.findings || []).join("; ")}`;
  }
  return null;
}

// Internal language that must never reach a customer. Deterministic — no model call.
const JARGON: { re: RegExp; why: string }[] = [
  // A hex run with BOTH letters and digits (a commit id) — not a phone number, not a word.
  { re: /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}\b/i, why: "a commit hash / id" },
  { re: /\bcommit\b/i, why: "\"commit\"" },
  { re: /\b(?:HTTP\s*)?[1-5]\d\d\b(?=[^\n]{0,20}\b(?:status|ok|verified|response)\b)|\bverified\s+[1-5]\d\d\b/i, why: "an HTTP status code" },
  { re: /\b[\w-]+\.(?:jpe?g|png|webp|svg|astro|tsx?|jsx?|json|css|html)\b/i, why: "a file name" },
  { re: /\bog[:\s-]?image\b|\bog\.jpg\b|\bOG image\b|\bmeta tags?\b/i, why: "web-dev jargon (og/meta)" },
  { re: /\b(?:preview-\d{4}|pages\.dev|localhost|\/api\/)/i, why: "an internal URL" },
  { re: /\b(?:CR|PR)\s*#?\w{6,}\b|\bcm[a-z0-9]{20,}\b/i, why: "an internal ticket id" },
  // Not "build"/"promote"/"production" — those are normal customer words ("we'll build the carousel").
  { re: /\b(?:deploy(?:ed|ment|s)?|staging|repo(?:sitory)?|github|prod)\b/i, why: "engineering language" },
];

/** Issues that make `text` unfit for a customer. Empty = fine. */
export function customerLanguageIssues(text: string): string[] {
  return JARGON.filter((j) => j.re.test(text)).map((j) => `contains ${j.why}`);
}

// Work no plan includes (src/lib/billing/plan-scope.ts NEVER_INCLUDED).
const OUT_OF_PLAN =
  /\b(?:facebook|instagram|tiktok|linkedin|twitter|pinterest|yelp|nextdoor|meta|social[- ]media|social (?:page|profile|account)s?|youtube channel|(?:run|manage|set up|launch|boost)(?:s|ing)? (?:your |the |some |more )?ads|ad campaigns?|ad accounts?|online ordering|payment funnels?|crm integrations?|mailchimp|newsletters?|email (?:marketing|campaigns?))\b/i;
// A commitment to DO something ("can't"/"cannot" are not commitments; "let us know" is not one).
const COMMITMENT =
  /\b(?:we(?:'|’)?ll|we will|we(?:'|’)re going to|we are going to|we can(?!(?:'|’)?t|not)|we(?:'|’)d (?:be happy|love) to|i(?:'|’)?ll|i will|i can(?!(?:'|’)?t|not)|i(?:'|’)m going to|happy to|our team will|andy will|let us (?!know))\b/i;
// The sentence says it is NOT something we do / not included, or offers the upgrade/add-on.
const NOT_INCLUDED =
  /\b(?:isn(?:'|’)?t (?:part|included|something)|is not (?:part|included|something)|not (?:part of|included|something we)|outside (?:of )?(?:your|the) plan|(?:can(?:'|’)?t|cannot|don(?:'|’)?t|do not|won(?:'|’)?t|will not) (?:\w+ ){0,2}(?:manage|handle|run|offer|do|build|create|post|set up|provide)|upgrade|add-on|quote (?:it|that|this|you|for)|we got that wrong)\b/i;

/**
 * Sentences that PROMISE work outside every plan ("We'll build you a clean page" right after
 * a sentence about Facebook). Deterministic backstop for the reviewers. Judged per sentence:
 * a commitment is flagged when it, or the sentence just before it, names out-of-plan work —
 * unless the commitment's own sentence disclaims it, or the sentence before it was the
 * disclaimer ("Facebook isn't something we handle. We'll pass it to the team.").
 */
export function outOfPlanPromises(text: string): string[] {
  const issues: string[] = [];
  for (const para of text.split(/\n\s*\n|\n(?=\s*[-•*]|\s*\d+[.)])/)) {
    const sentences = para.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
    sentences.forEach((s, i) => {
      if (!COMMITMENT.test(s) || NOT_INCLUDED.test(s)) return;
      const prev = i > 0 ? sentences[i - 1] : "";
      const topical = OUT_OF_PLAN.test(s) || (!!prev && OUT_OF_PLAN.test(prev) && !NOT_INCLUDED.test(prev));
      if (topical) {
        const quoted = (prev && !OUT_OF_PLAN.test(s) ? `${prev} ${s}` : s).slice(0, 140);
        issues.push(`promises work outside the customer's plan: "${quoted}"`);
      }
    });
  }
  return issues;
}
