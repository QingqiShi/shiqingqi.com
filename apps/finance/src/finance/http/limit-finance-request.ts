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
  "verify-email": { tokens: 5, window: "1 h" },
  "recovery-email-ip": { tokens: 10, window: "1 h" },
  "recovery-email-address": { tokens: 3, window: "1 h" },
  "sign-up-ip": { tokens: 10, window: "1 h" },
  "sign-up-address": { tokens: 3, window: "1 h" },
  "bank-sync": { tokens: 6, window: "1 h" },
  "ai-suggest": { tokens: 30, window: "60 s" },
  "ai-quick-add": { tokens: 60, window: "60 s" },
  "ai-teach": { tokens: 10, window: "60 s" },
  "report-regenerate": { tokens: 10, window: "60 s" },
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

/**
 * Gives back one request that `limitFinanceRequest` counted, for a request
 * that failed on the server. Near the end of a window, the token can go to
 * the next window instead.
 */
export async function refundFinanceRequest(
  bucket: FinanceRateLimitBucket,
  identifier: string,
): Promise<void> {
  if (!isLimitOn()) return;
  await getLimiter(bucket).limit(identifier, { rate: -1 });
}
