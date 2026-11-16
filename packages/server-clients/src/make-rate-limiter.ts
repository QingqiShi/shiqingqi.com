import { Ratelimit } from "@upstash/ratelimit";
import "server-only";
import { getRedisClient } from "./get-redis-client.ts";

interface RateLimit {
  tokens: number;
  window: `${number} ${"s" | "m" | "h"}`;
}

export interface RateLimitResult {
  success: boolean;
  /** Unix-ms timestamp when the limit resets. */
  reset: number;
}

/**
 * Sliding-window limits in Upstash Redis, one for each bucket. While `isOn`
 * gives false, every request is allowed and Redis is not used.
 */
export function makeRateLimiter<Bucket extends string>({
  prefix,
  limits,
  isOn,
}: {
  /** The start of each Redis key, e.g. the app's name. */
  prefix: string;
  limits: Record<Bucket, RateLimit>;
  isOn: () => boolean;
}) {
  const limiters = new Map<Bucket, Ratelimit>();

  function getLimiter(bucket: Bucket): Ratelimit {
    let limiter = limiters.get(bucket);
    if (!limiter) {
      const { tokens, window } = limits[bucket];
      limiter = new Ratelimit({
        redis: getRedisClient(),
        limiter: Ratelimit.slidingWindow(tokens, window),
        prefix: `${prefix}:${bucket}`,
        analytics: false,
      });
      limiters.set(bucket, limiter);
    }
    return limiter;
  }

  return {
    /** Counts one request of `identifier` against the limit of `bucket`. */
    limit: async (
      bucket: Bucket,
      identifier: string,
    ): Promise<RateLimitResult> => {
      if (!isOn()) return { success: true, reset: 0 };
      const result = await getLimiter(bucket).limit(identifier);
      return { success: result.success, reset: result.reset };
    },

    /**
     * Gives back one request that `limit` counted, for a request that failed
     * on the server. Near the end of a window, the token can go to the next
     * window instead.
     */
    refund: async (bucket: Bucket, identifier: string): Promise<void> => {
      if (!isOn()) return;
      await getLimiter(bucket).limit(identifier, { rate: -1 });
    },
  };
}
