import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";

// We need to test the rate limiter with a fresh module state for isolation
// Since the store is module-level, we re-import each time
describe("rate-limit", () => {
  let enforceRateLimit: typeof import("./rate-limit").enforceRateLimit;
  let RateLimits: typeof import("./rate-limit").RateLimits;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./rate-limit");
    enforceRateLimit = mod.enforceRateLimit;
    RateLimits = mod.RateLimits;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fakeCtx(userId?: number) {
    return {
      user: userId ? { id: userId, role: "user" as const } : null,
      req: {
        headers: new Headers({ "x-forwarded-for": "1.2.3.4" }),
      },
    } as any;
  }

  it("allows requests within the rate limit", () => {
    const ctx = fakeCtx(1);
    // Should not throw for a few requests
    for (let i = 0; i < 5; i++) {
      expect(() =>
        enforceRateLimit(ctx, "test", { maxRequests: 10, windowMs: 60000 }),
      ).not.toThrow();
    }
  });

  it("throws TOO_MANY_REQUESTS when limit is exceeded", () => {
    const ctx = fakeCtx(2);
    const config = { maxRequests: 3, windowMs: 60000 };

    // First 3 should succeed
    enforceRateLimit(ctx, "test", config);
    enforceRateLimit(ctx, "test", config);
    enforceRateLimit(ctx, "test", config);

    // 4th should fail
    expect(() => enforceRateLimit(ctx, "test", config)).toThrowError(
      /too many requests/i,
    );
  });

  it("uses IP-based key for unauthenticated requests", () => {
    const ctx = fakeCtx(); // no user
    const config = { maxRequests: 2, windowMs: 60000 };

    enforceRateLimit(ctx, "anon-test", config);
    enforceRateLimit(ctx, "anon-test", config);
    expect(() => enforceRateLimit(ctx, "anon-test", config)).toThrowError(
      /too many requests/i,
    );
  });

  it("different prefixes have independent limits", () => {
    const ctx = fakeCtx(3);
    const config = { maxRequests: 1, windowMs: 60000 };

    enforceRateLimit(ctx, "prefix-a", config);
    expect(() => enforceRateLimit(ctx, "prefix-a", config)).toThrowError(
      /too many/i,
    );

    // Different prefix should still work
    expect(() =>
      enforceRateLimit(ctx, "prefix-b", config),
    ).not.toThrow();
  });

  it("different users have independent limits", () => {
    const config = { maxRequests: 1, windowMs: 60000 };

    enforceRateLimit(fakeCtx(10), "user-test", config);
    expect(() =>
      enforceRateLimit(fakeCtx(10), "user-test", config),
    ).toThrowError(/too many/i);

    // Different user should still work
    expect(() =>
      enforceRateLimit(fakeCtx(20), "user-test", config),
    ).not.toThrow();
  });

  it("RateLimits presets have expected values", () => {
    expect(RateLimits.auth.maxRequests).toBe(10);
    expect(RateLimits.auth.windowMs).toBe(15 * 60 * 1000);
    expect(RateLimits.chat.maxRequests).toBe(30);
    expect(RateLimits.chat.windowMs).toBe(5 * 60 * 1000);
    expect(RateLimits.mutation.maxRequests).toBe(60);
    expect(RateLimits.mutation.windowMs).toBe(60 * 1000);
  });

  it("thrown error is a TRPCError with correct code", () => {
    const ctx = fakeCtx(99);
    const config = { maxRequests: 1, windowMs: 60000 };
    enforceRateLimit(ctx, "trpc-test", config);
    try {
      enforceRateLimit(ctx, "trpc-test", config);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    }
  });
});
