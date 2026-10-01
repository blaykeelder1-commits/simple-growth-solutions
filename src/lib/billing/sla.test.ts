import { describe, it, expect } from "vitest";
import { computeSlaDueAt, rushIsBilled, sameBusinessDayDue, slaKind, slaLabel } from "./sla";

// 2026-09-30 is a Wednesday; Central time is CDT (UTC-5).
const ct = (iso: string) => new Date(iso); // ISO strings below carry the -05:00 offset

describe("same business day (Central, Mon–Fri, 2 pm cutoff, due 6 pm)", () => {
  it("a weekday request before 2 pm is due 6 pm the same day", () => {
    expect(sameBusinessDayDue(ct("2026-09-30T10:00:00-05:00")).toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });
  it("a weekday request after 2 pm is due 6 pm the next business day", () => {
    expect(sameBusinessDayDue(ct("2026-09-30T15:30:00-05:00")).toISOString()).toBe("2026-10-01T23:00:00.000Z");
  });
  it("a Friday-evening or weekend request is due 6 pm Monday", () => {
    expect(sameBusinessDayDue(ct("2026-10-02T16:00:00-05:00")).toISOString()).toBe("2026-10-05T23:00:00.000Z");
    expect(sameBusinessDayDue(ct("2026-10-03T09:00:00-05:00")).toISOString()).toBe("2026-10-05T23:00:00.000Z");
  });
  it("handles standard time (CST, UTC-6) after the November change", () => {
    expect(sameBusinessDayDue(ct("2026-11-10T09:00:00-06:00")).toISOString()).toBe("2026-11-11T00:00:00.000Z");
  });
});

describe("turnaround per plan matches the pricing page", () => {
  it("Premium is same day on every request, monthly or annual", () => {
    expect(slaKind({ isRush: false, plan: "website_premium" })).toBe("same_day");
    expect(slaKind({ isRush: false, plan: "website_premium_annual" })).toBe("same_day");
  });
  it("Pro is 24h, and same day with a (free) rush; annual too", () => {
    expect(slaKind({ isRush: false, plan: "website_pro_annual" })).toBe("24h");
    expect(slaKind({ isRush: true, plan: "website_pro" })).toBe("same_day");
  });
  it("Managed is 5 business days, same day with a $49 rush", () => {
    expect(slaKind({ isRush: false, plan: "website_managed" })).toBe("5_business_days");
    expect(slaKind({ isRush: true, plan: "website_managed_annual" })).toBe("same_day");
    const due = computeSlaDueAt({ isRush: false, plan: "website_managed", now: ct("2026-09-30T10:00:00-05:00") });
    expect(due.getUTCDate()).toBe(7); // Wed + 5 business days = next Wed
  });
  it("rush is billed only on Managed", () => {
    expect(rushIsBilled("website_managed")).toBe(true);
    expect(rushIsBilled("website_managed_annual")).toBe(true);
    expect(rushIsBilled("website_pro")).toBe(false);
    expect(rushIsBilled("website_premium_annual")).toBe(false);
  });
  it("labels never say 3–5 days", () => {
    expect(slaLabel({ isRush: false, plan: "website_managed" })).toBe("Within 5 business days");
  });
});
