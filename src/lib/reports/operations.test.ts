import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { firstPassStats, median, type DecidedApproval } from "./operations";

const at = (m: number) => new Date(Date.UTC(2026, 8, 1, 0, m));
const item = (refId: string, status: string, minute: number, kind = "support_reply"): DecidedApproval => ({
  kind,
  refId,
  status,
  decidedAt: status === "superseded" ? null : at(minute),
  createdAt: at(minute),
});

describe("median", () => {
  it("handles empty, odd and even inputs", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("firstPassStats", () => {
  it("counts a piece as first-pass only when the FIRST decision was a yes", () => {
    const s = firstPassStats([
      item("a", "sent", 1), // yes first time
      item("b", "edits_requested", 1), // needed edits...
      item("b", "sent", 5), // ...then yes → not first-pass
      item("c", "rejected", 2),
    ]);
    expect(s).toEqual({ pieces: 3, firstPass: 1, firstPassPct: 33, avgEditRounds: 0.3 });
  });

  it("ignores superseded and still-awaiting items", () => {
    const s = firstPassStats([item("a", "superseded", 1), item("a", "awaiting", 2)]);
    expect(s.pieces).toBe(0);
    expect(s.firstPassPct).toBeNull();
  });

  it("keeps the same target under different kinds separate", () => {
    const s = firstPassStats([item("x", "sent", 1, "cr_ship"), item("x", "edits_requested", 1, "support_reply")]);
    expect(s.pieces).toBe(2);
    expect(s.firstPass).toBe(1);
  });
});
