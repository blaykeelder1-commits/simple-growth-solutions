import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { customerLanguageIssues, outOfPlanPromises, subjectHash, validateReview, type ReviewRecord } from "./index";

const good = (text: string): ReviewRecord => ({
  subjectHash: subjectHash(text),
  rounds: 1,
  passes: [
    { lens: "requirement", verdict: "pass", findings: [] },
    { lens: "skeptic", verdict: "pass", findings: [] },
    { lens: "customer", verdict: "pass", findings: [] },
  ],
});

describe("3-pass review gate", () => {
  it("accepts three passing reviews of the exact text", () => {
    expect(validateReview(good("Hi Jorge"), "Hi Jorge")).toBeNull();
  });
  it("rejects a missing review", () => {
    expect(validateReview(undefined, "x")).toMatch(/missing review/);
  });
  it("rejects a review of different text (reviewed one draft, submitted another)", () => {
    expect(validateReview(good("draft 1"), "draft 2")).toMatch(/different text/);
  });
  it("rejects when any lens failed or is missing", () => {
    const r = good("t");
    r.passes[1] = { lens: "skeptic", verdict: "fail", findings: ["wrong phone"] };
    expect(validateReview(r, "t")).toMatch(/skeptic.*wrong phone/);
    expect(validateReview({ ...good("t"), passes: good("t").passes.slice(0, 2) }, "t")).toMatch(/customer/);
  });
});

describe("out-of-plan promise check", () => {
  const fixture = (f: string) => readFileSync(join(__dirname, "__fixtures__", f), "utf-8");
  it("refuses the real 2026-09-29 morning message that promised a Facebook page", () => {
    const issues = outOfPlanPromises(fixture("andy-morning-bbkn.txt"));
    expect(issues.length).toBe(1);
    expect(issues[0]).toMatch(/Facebook/);
  });
  it("passes the correction (SH8TT) that says the Facebook page isn't part of the plan", () => {
    expect(outOfPlanPromises(fixture("jorge-sh8tt.txt"))).toEqual([]);
  });
  it("passes SC8EX, which mentions Facebook only as where links get shared", () => {
    expect(outOfPlanPromises(fixture("jorge-sc8ex.txt"))).toEqual([]);
  });
  it.each([
    "We can't manage your Instagram, but we can update the Instagram link on your site.",
    "Facebook isn't something we handle. We'll pass your question to the team.",
    "Unfortunately that's not included in your plan, but we can quote it as an add-on.",
    "We've updated your Facebook link. Let us know if it looks right.",
    "Since you're advertising, we'll make sure your website loads fast for ad visitors.",
  ])("does not block the honest reply %j", (t) => {
    expect(outOfPlanPromises(t)).toEqual([]);
  });

  it.each([
    "I'll set up your Facebook page and run your ads.",
    "Our team will manage your ads every month.",
    "We can start a newsletter for you next week.",
    "You have no Yelp listing yet. We'll create one for you.",
  ])("blocks the out-of-plan promise %j", (t) => {
    expect(outOfPlanPromises(t)).toHaveLength(1);
  });

  it("offering the upgrade is fine; promising the work is not", () => {
    expect(outOfPlanPromises("Online ordering isn't part of your Managed plan — we can quote it as an add-on.")).toEqual([]);
    expect(outOfPlanPromises("We'll set up Instagram for you this week.")).toHaveLength(1);
  });
});

describe("customer language lint", () => {
  it("catches the real 2026-09-29 completion note", () => {
    const issues = customerLanguageIssues(
      "Shipped og.jpg OG image fix — new orange brand + real bin photo + correct phone (816) 810-1956 live at https://wasterescuekc.com (commit ad45011, verified 200)"
    );
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
  it("does not flag phone numbers, ordinary words or 'our KC branch'", () => {
    expect(customerLanguageIssues("Call 8168101956 — our Kansas City branch effaced the old sign")).toEqual([]);
  });

  it("passes the full plain-language reply we actually sent Jorge (SC8EX)", () => {
    const sent = readFileSync(join(__dirname, "__fixtures__", "jorge-sc8ex.txt"), "utf-8");
    expect(customerLanguageIssues(sent)).toEqual([]);
  });
});
