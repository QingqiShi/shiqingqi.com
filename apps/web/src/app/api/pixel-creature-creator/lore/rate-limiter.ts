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
