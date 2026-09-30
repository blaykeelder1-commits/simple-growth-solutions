import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/email", () => ({ sendCancellationScheduledEmail: vi.fn(), sendDowngradeScheduledEmail: vi.fn() }));
import { downgradeTarget } from "./cancellation";

describe("downgradeTarget (the one save offer)", () => {
  it("offers Managed to Pro and Premium, keeping annual billing annual", () => {
    expect(downgradeTarget("website_pro")).toBe("website_managed");
    expect(downgradeTarget("website_premium")).toBe("website_managed");
    expect(downgradeTarget("website_pro_annual")).toBe("website_managed_annual");
    expect(downgradeTarget("growth_bundle")).toBe("website_managed");
  });
  it("has nothing cheaper to offer a Managed customer", () => {
    expect(downgradeTarget("website_managed")).toBeNull();
    expect(downgradeTarget("website_managed_annual")).toBeNull();
    expect(downgradeTarget("starter_bundle")).toBeNull();
  });
});
