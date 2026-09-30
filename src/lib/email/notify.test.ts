import { describe, it, expect, vi, beforeEach } from "vitest";

const recordWorkEvent = vi.fn();
vi.mock("@/lib/work/events", () => ({ recordWorkEvent: (e: unknown) => recordWorkEvent(e) }));
vi.mock("@/lib/logger", () => ({ apiLogger: { error: vi.fn() } }));
import { notifyCustomer } from "./notify";

const entity = { entityType: "support" as const, entityId: "org1" };

describe("notifyCustomer", () => {
  beforeEach(() => recordWorkEvent.mockReset());

  it("records customer_emailed with the provider id and returns true", async () => {
    expect(await notifyCustomer(entity, "support reply email", async () => ({ id: "re_123" }))).toBe(true);
    expect(recordWorkEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "customer_emailed", entityId: "org1", note: "support reply email (id re_123)" })
    );
  });

  it("records customer_email_failed and returns false instead of throwing", async () => {
    const ok = await notifyCustomer(entity, "support reply email", async () => {
      throw new Error("domain not verified");
    });
    expect(ok).toBe(false);
    expect(recordWorkEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "customer_email_failed", note: "support reply email: domain not verified" })
    );
  });
});
