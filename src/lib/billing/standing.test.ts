import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { bestStanding, standingOf, type StandingSub } from "./standing";

const now = new Date("2026-09-30T12:00:00Z");
const sub = (o: Partial<StandingSub>): StandingSub => ({
  id: "s",
  plan: "website_pro",
  status: "active",
  processor: "square",
  currentPeriodEnd: new Date("2026-10-17T00:00:00Z"),
  ...o,
});

describe("standingOf", () => {
  it("a Square-billed active plan is paid", () => {
    expect(standingOf(sub({}), now)).toBe("paid");
  });

  it("a Square plan still awaiting its first payment, past due or canceled is unpaid", () => {
    for (const status of ["awaiting_payment", "past_due", "canceled", "pending"]) {
      expect(standingOf(sub({ status }), now)).toBe("unpaid");
    }
  });

  it("a manual plan is a comp only until its end date — never paid", () => {
    expect(standingOf(sub({ processor: "manual" }), now)).toBe("comp");
    expect(standingOf(sub({ processor: "manual", currentPeriodEnd: new Date("2026-09-29T00:00:00Z") }), now)).toBe("unpaid");
    expect(standingOf(sub({ processor: "manual", currentPeriodEnd: null }), now)).toBe("unpaid");
  });

  it("the Waste Rescue KC shape ($0 manual, comp ended) is unpaid", () => {
    expect(standingOf(sub({ processor: "manual", currentPeriodEnd: now }), now)).toBe("unpaid");
  });
});

describe("declined renewal grace", () => {
  it("stays paid for 7 days after a failed charge, then unpaid", () => {
    const day = 24 * 60 * 60 * 1000;
    expect(standingOf(sub({ paymentFailedAt: new Date(now.getTime() - 6 * day) }), now)).toBe("paid");
    expect(standingOf(sub({ paymentFailedAt: new Date(now.getTime() - 8 * day) }), now)).toBe("unpaid");
    expect(standingOf(sub({ paymentFailedAt: null }), now)).toBe("paid");
  });
});

describe("bestStanding", () => {
  it("paid beats comp beats unpaid, and reports the comp end date", () => {
    const comp = sub({ id: "c", processor: "manual" });
    const dead = sub({ id: "d", status: "canceled" });
    expect(bestStanding([dead, comp], now)).toMatchObject({ standing: "comp", sub: { id: "c" }, compUntil: comp.currentPeriodEnd });
    expect(bestStanding([comp, sub({ id: "p" })], now).standing).toBe("paid");
    expect(bestStanding([], now)).toEqual({ standing: "unpaid", sub: null, compUntil: null });
  });
});
