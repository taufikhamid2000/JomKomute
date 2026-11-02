import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientIp, memoryLimit, rateLimitWithStore, resetMemoryLimiter, type RateStore } from "./rate-limit";

vi.mock("@/lib/supabase-server", () => ({ supabaseServer: () => ({}) }));

const req = (h: Record<string, string>) => ({ headers: new Headers(h) });

describe("clientIp", () => {
  it("uses first x-forwarded-for hop", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(req({}))).toBe("unknown");
  });
  it("caps length", () => {
    expect(clientIp(req({ "x-forwarded-for": "a".repeat(500) })).length).toBe(64);
  });
});

describe("memoryLimit", () => {
  beforeEach(() => resetMemoryLimiter());
  it("allows up to the limit then blocks, and resets after the window", () => {
    expect(memoryLimit("k", 2, 1000, 0).allowed).toBe(true);
    expect(memoryLimit("k", 2, 1000, 1).allowed).toBe(true);
    const blocked = memoryLimit("k", 2, 1000, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(1);
    expect(memoryLimit("k", 2, 1000, 1001).allowed).toBe(true);
  });
  it("isolates keys", () => {
    memoryLimit("a", 1, 1000, 0);
    expect(memoryLimit("b", 1, 1000, 0).allowed).toBe(true);
  });
});

describe("rateLimitWithStore", () => {
  beforeEach(() => {
    resetMemoryLimiter();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  it("uses the store result and passes key/window", async () => {
    const store = vi.fn<RateStore>().mockResolvedValue({ allowed: false, retryAfter: 7 });
    const r = await rateLimitWithStore(store, "1.1.1.1", "pings-write", 30, 60_000);
    expect(r).toEqual({ allowed: false, retryAfter: 7 });
    expect(store).toHaveBeenCalledWith("pings-write:1.1.1.1", 30, 60);
  });
  it("falls back to in-memory limiting when the store throws (not open, not down)", async () => {
    const store: RateStore = async () => {
      throw new Error("db down");
    };
    expect((await rateLimitWithStore(store, "2.2.2.2", "s", 2, 60_000)).allowed).toBe(true);
    expect((await rateLimitWithStore(store, "2.2.2.2", "s", 2, 60_000)).allowed).toBe(true);
    expect((await rateLimitWithStore(store, "2.2.2.2", "s", 2, 60_000)).allowed).toBe(false);
  });
});
