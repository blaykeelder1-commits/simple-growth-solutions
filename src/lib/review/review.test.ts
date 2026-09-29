import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { customerLanguageIssues, subjectHash, validateReview, type ReviewRecord } from "./index";

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
