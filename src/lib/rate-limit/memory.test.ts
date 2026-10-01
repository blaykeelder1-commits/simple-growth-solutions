import { describe, it, expect, vi } from "vitest";

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return null; } } }));
import { memoryLimit } from "./index";

describe("in-memory rate limit fallback (no Upstash configured)", () => {
  it("allows 5 login attempts a minute per IP, then blocks, then resets", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(memoryLimit("login", "1.2.3.4", t0).success).toBe(true);
    expect(memoryLimit("login", "1.2.3.4", t0).success).toBe(false);
    expect(memoryLimit("login", "5.6.7.8", t0).success).toBe(true); // other IPs unaffected
    expect(memoryLimit("login", "1.2.3.4", t0 + 61_000).success).toBe(true); // new window
  });
});
