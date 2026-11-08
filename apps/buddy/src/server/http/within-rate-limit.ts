import type { BuddyKv } from "../store/types.ts";

/**
 * A fixed window: true while `key` has had at most `limit` hits in the
 * window that its first hit started.
 */
export async function withinRateLimit(
  kv: BuddyKv,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  return (await kv.increment(`buddy:rate:${key}`, windowSeconds)) <= limit;
}

export function slowDown(retryAfterSeconds: number) {
  return Response.json(
    { error: "slow_down" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}
