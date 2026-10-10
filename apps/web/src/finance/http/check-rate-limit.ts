import { financeJson } from "./finance-json.ts";
import type { FinanceRateLimitBucket, LimitFinanceRequest } from "./types.ts";

/**
 * A 429 `too-many-requests` response when `identifier` is over the limit of
 * `bucket`, else null. A limiter that fails lets the request through: these
 * routes need a session, so the limit only guards cost.
 */
export async function checkRateLimit(
  limit: LimitFinanceRequest | undefined,
  bucket: FinanceRateLimitBucket,
  identifier: string,
  now: Date,
): Promise<Response | null> {
  if (!limit) return null;
  let result;
  try {
    result = await limit(bucket, identifier);
  } catch (error) {
    console.error("Finance rate limit failed", error);
    return null;
  }
  if (result.success) return null;
  const seconds = Math.max(1, Math.ceil((result.reset - now.getTime()) / 1000));
  return financeJson(
    { error: "too-many-requests" },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}
