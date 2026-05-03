import { Ratelimit } from "@upstash/ratelimit";
import "server-only";
import { getRedisClient } from "#src/session-store/client.ts";

let cached: Ratelimit | null = null;

function getLoreRateLimiter(): Ratelimit {
  if (!cached) {
    cached = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "pcc:lore",
      analytics: false,
    });
  }
  return cached;
}

export interface LoreRateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

/**
 * Sliding-window 10 req / 60 s / IP. Returning a narrowed shape (instead of
 * the full `Ratelimit` instance) keeps the route handler's surface small
 * and lets tests stub the limiter without reaching into provider internals.
 */
export async function limitLoreRequest(
  identifier: string,
): Promise<LoreRateLimitResult> {
  const result = await getLoreRateLimiter().limit(identifier);
  return { success: result.success, reset: result.reset };
}

/**
 * Resolve the client IP for rate-limit bucketing.
 *
 * Header preference order (most-trusted first):
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge and not forwardable
 *      from the client, so it's the safest source of the original IP.
 *   2. `x-forwarded-for` — broadly used but client-spoofable, so only
 *      consulted when the platform-trusted header is absent.
 *   3. `"unknown"` — a stable bucket so misconfigured deployments still
 *      apply *some* throttling rather than offering an unmetered escape
 *      hatch.
 *
 * Both header values are comma-separated lists; we take the first non-empty
 * trimmed entry (the original client IP as recorded by the proxy).
 */
export function resolveClientIp(headers: Headers): string {
  const candidates = [
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-forwarded-for"),
  ];
  for (const value of candidates) {
    if (value === null) continue;
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return "unknown";
}
