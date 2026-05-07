import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../context";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Check rate limit for a given key.
 * @returns true if the request should be allowed, false if rate limited.
 */
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxRequests;
}

/**
 * Extracts a rate-limit key from context.
 * Uses user ID if authenticated, otherwise falls back to a header-based identifier.
 */
function getKey(ctx: TrpcContext, prefix: string): string {
  if (ctx.user) {
    return `${prefix}:user:${ctx.user.id}`;
  }
  // Use forwarded IP or a fallback for unauthenticated requests
  const forwarded = ctx.req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:ip:${ip}`;
}

/**
 * Rate limit presets.
 */
export const RateLimits = {
  /** Auth endpoints: 10 attempts per 15 minutes */
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  /** Chat/AI endpoints: 30 messages per 5 minutes */
  chat: { maxRequests: 30, windowMs: 5 * 60 * 1000 },
  /** Write endpoints (mutations): 60 per minute */
  mutation: { maxRequests: 60, windowMs: 60 * 1000 },
} as const;

/**
 * Enforce a rate limit. Throws a TRPC TOO_MANY_REQUESTS error if exceeded.
 */
export function enforceRateLimit(
  ctx: TrpcContext,
  prefix: string,
  config: { maxRequests: number; windowMs: number },
) {
  const key = getKey(ctx, prefix);
  if (!checkRateLimit(key, config.maxRequests, config.windowMs)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
}
