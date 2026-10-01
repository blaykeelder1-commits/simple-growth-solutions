import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
import { mergeChanges, type AgentChange } from "./changes";

const row = (key: string, at: string): AgentChange => ({
  key,
  type: "t",
  entityType: "e",
  entityId: key,
  organizationId: null,
  at,
});
const since = new Date("2026-10-01T10:00:00.000Z");
const now = new Date("2026-10-01T12:00:00.000Z");

describe("agent change feed", () => {
  it("returns rows after `since`, oldest first, and resumes from `now`", () => {
    const r = mergeChanges(
      [row("b", "2026-10-01T11:00:00.000Z"), row("a", "2026-10-01T10:30:00.000Z"), row("old", "2026-10-01T10:00:00.000Z")],
      since,
      now,
    );
    expect(r.changes.map((c) => c.key)).toEqual(["a", "b"]);
    expect(r.next).toBe(now.toISOString());
    expect(r.truncated).toBe(false);
  });

  it("when truncated, resumes from the last returned row so nothing is skipped", () => {
    const rows = [row("a", "2026-10-01T10:10:00.000Z"), row("b", "2026-10-01T10:20:00.000Z"), row("c", "2026-10-01T10:30:00.000Z")];
    const r = mergeChanges(rows, since, now, 2);
    expect(r.changes.map((c) => c.key)).toEqual(["a", "b"]);
    expect(r.truncated).toBe(true);
    expect(r.next).toBe("2026-10-01T10:20:00.000Z");
  });

  it("orders same-timestamp rows by key (stable across calls)", () => {
    const t = "2026-10-01T11:00:00.000Z";
    expect(mergeChanges([row("z", t), row("m", t)], since, now).changes.map((c) => c.key)).toEqual(["m", "z"]);
  });
});
