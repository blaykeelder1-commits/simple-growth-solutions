import { describe, it, expect } from "vitest";
import { scoreLead, type QualifyInput } from "./score";

const base: QualifyInput = {
  trade: "plumbing",
  desiredAction: "call",
  currentLeadSource: "referrals",
  readyThisWeek: true,
  hasWebsite: true,
  siteScore: 45,
};

describe("scoreLead", () => {
  it("a ready contractor who wants calls is a fit", () => {
    const r = scoreLead(base);
    expect(r.status).toBe("fit");
    expect(r.score).toBe(8);
  });

  it("the same contractor NOT ready this week goes to review, whatever the score", () => {
    const r = scoreLead({ ...base, readyThisWeek: false, hasWebsite: false });
    expect(r.status).toBe("review");
    expect(r.reasons.some((x) => x.includes("not ready"))).toBe(true);
  });

  it("an online store is declined (quote path), even if otherwise strong", () => {
    expect(scoreLead({ ...base, trade: "retail_ecommerce" }).status).toBe("decline");
    expect(scoreLead({ ...base, desiredAction: "buy_online" }).status).toBe("decline");
  });

  it("a non-core business lands in review even when ready", () => {
    const r = scoreLead({ ...base, trade: "restaurant", siteScore: 90 });
    expect(r.score).toBe(5);
    expect(r.status).toBe("review");
  });

  it("a good existing site earns no improvement point", () => {
    const r = scoreLead({ ...base, siteScore: 85 });
    expect(r.score).toBe(7);
    expect(r.status).toBe("fit");
  });

  it("every point has a reason", () => {
    const r = scoreLead(base);
    const summed = r.reasons.reduce((s, x) => s + Number(x.match(/^\+(\d)/)?.[1] ?? 0), 0);
    expect(summed).toBe(r.score);
  });
});
