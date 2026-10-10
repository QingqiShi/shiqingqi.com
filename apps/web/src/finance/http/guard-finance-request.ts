import type { FinanceSession } from "../auth/types.ts";
import { checkRateLimit } from "./check-rate-limit.ts";
import { financeJson } from "./finance-json.ts";
import { isSameOrigin } from "./is-same-origin.ts";
import type { FinanceRateLimitBucket, LimitFinanceRequest } from "./types.ts";

interface FinanceRequestGuardDependencies {
  isConfigured: () => boolean;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  limitRequest?: LimitFinanceRequest;
  now?: () => Date;
}

export interface FinanceRequestGuardOptions {
  /** A write also needs a same-origin request. */
  write: boolean;
  owner?: boolean;
  rateLimit?: { bucket: FinanceRateLimitBucket; per: "household" | "user" };
  /** Sent with the 503 `not-configured` response. */
  notConfiguredMessage?: string;
}

/**
 * The checks every session route of the Finance API runs first, in order:
 * the database is set up, a write comes from the same origin, there is a
 * session, an owner-only route has the owner, and the rate limit allows the
 * request. Returns the session, or the response that refuses the request.
 */
export async function guardFinanceRequest(
  dependencies: FinanceRequestGuardDependencies,
  request: Request,
  options: FinanceRequestGuardOptions,
): Promise<FinanceSession | Response> {
  if (!dependencies.isConfigured()) {
    return financeJson(
      { error: "not-configured", message: options.notConfiguredMessage },
      { status: 503 },
    );
  }
  if (options.write && !isSameOrigin(request)) {
    return financeJson({ error: "forbidden-origin" }, { status: 403 });
  }
  const session = await dependencies.getSession(request);
  if (!session) return financeJson({ error: "unauthorised" }, { status: 401 });
  if (options.owner && session.role !== "owner") {
    return financeJson({ error: "owner-only" }, { status: 403 });
  }
  if (options.rateLimit) {
    const { bucket, per } = options.rateLimit;
    const limited = await checkRateLimit(
      dependencies.limitRequest,
      bucket,
      per === "user" ? session.userId : session.householdId,
      dependencies.now?.() ?? new Date(),
    );
    if (limited) return limited;
  }
  return session;
}
