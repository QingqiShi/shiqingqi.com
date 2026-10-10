import { Ratelimit } from "@upstash/ratelimit";
import "server-only";
import { getRedisClient } from "#src/redis/get-redis-client.ts";
import type {
  FinanceRateLimitBucket,
  FinanceRateLimitResult,
} from "./types.ts";

const LIMITS: Record<
  FinanceRateLimitBucket,
  { tokens: number; window: `${number} ${"s" | "m" | "h"}` }
> = {
  auth: { tokens: 10, window: "60 s" },
  "bank-sync": { tokens: 6, window: "1 h" },
  "ai-suggest": { tokens: 30, window: "60 s" },
  "report-regenerate": { tokens: 10, window: "60 s" },
  "report-image": { tokens: 20, window: "60 s" },
};

const limiters = new Map<FinanceRateLimitBucket, Ratelimit>();

function getLimiter(bucket: FinanceRateLimitBucket): Ratelimit {
  let limiter = limiters.get(bucket);
  if (!limiter) {
    const { tokens, window } = LIMITS[bucket];
    limiter = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `finance:${bucket}`,
      analytics: false,
    });
    limiters.set(bucket, limiter);
  }
  return limiter;
}

function isLimitOn(): boolean {
  if (process.env.FINANCE_RATE_LIMIT === "off") return false;
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
  );
}

/**
 * Counts one request of `identifier` against the limit of `bucket`. Allows
 * every request when Redis is not set up, or when `FINANCE_RATE_LIMIT=off`
 * (end-to-end tests).
 */
export async function limitFinanceRequest(
  bucket: FinanceRateLimitBucket,
  identifier: string,
): Promise<FinanceRateLimitResult> {
  if (!isLimitOn()) return { success: true, reset: 0 };
  const result = await getLimiter(bucket).limit(identifier);
  return { success: result.success, reset: result.reset };
}
