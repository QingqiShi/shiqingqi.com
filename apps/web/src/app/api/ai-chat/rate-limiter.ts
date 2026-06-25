import { Ratelimit } from "@upstash/ratelimit";
import "server-only";
import { getRedisClient } from "#src/session-store/client.ts";

let cached: Ratelimit | null = null;

function getChatRateLimiter(): Ratelimit {
  if (!cached) {
    cached = new Ratelimit({
      redis: getRedisClient(),
      // Chat is multi-turn and tool-using, so each request can fan out into
      // several Anthropic calls. 20 / 60 s / IP keeps a single tab usable for
      // genuine back-and-forth while still capping a runaway script at a
      // budget the owner can absorb.
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      // Distinct prefix from `pcc:lore` so the two limiters don't share a
      // bucket — a busy chat user shouldn't lock themselves out of lore
      // generation, and vice versa.
      prefix: "ai:chat",
      analytics: false,
    });
  }
  return cached;
}

export interface ChatRateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

/**
 * Sliding-window 20 req / 60 s / IP. Returning a narrowed shape (instead of
 * the full `Ratelimit` instance) keeps the route handler's surface small
 * and lets tests stub the limiter without reaching into provider internals.
 */
export async function limitChatRequest(
  identifier: string,
): Promise<ChatRateLimitResult> {
  const result = await getChatRateLimiter().limit(identifier);
  return { success: result.success, reset: result.reset };
}
