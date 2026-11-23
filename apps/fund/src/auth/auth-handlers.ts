import type { AuthRateLimitBucket } from "@tuja/server-auth/make-auth";
import { makeRateLimiter } from "@tuja/server-clients/make-rate-limiter";
import { after } from "next/server";
import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { getFundEmailSender } from "#src/email/get-fund-email-sender.ts";
import { clientIp } from "./client-ip.ts";
import { getAuthSecret } from "./get-auth-secret.ts";
import { isAllowedFundOrigin } from "./is-allowed-fund-origin.ts";
import { makeFundAuth } from "./make-fund-auth.ts";

function hasRedis() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

/** The limits of every app's sign-in. Without Redis they are off, which only a local server permits. */
const limiter = makeRateLimiter<AuthRateLimitBucket>({
  prefix: "fund:rate:auth",
  limits: {
    auth: { tokens: 10, window: "60 s" },
    "recovery-email-ip": { tokens: 10, window: "1 h" },
    "recovery-email-address": { tokens: 3, window: "1 h" },
    "sign-up-ip": { tokens: 10, window: "1 h" },
    "sign-up-address": { tokens: 3, window: "1 h" },
  },
  isOn: hasRedis,
});

export const authHandlers = makeFundAuth({
  getDb: () => (process.env.FUND_DATABASE_URL ? getFundDb() : null),
  now: () => new Date(),
  authSecret: getAuthSecret,
  isAllowedOrigin: isAllowedFundOrigin,
  limitRequest: (bucket, identifier) => {
    if (process.env.VERCEL_URL && !hasRedis()) {
      throw new Error(
        "Paper Fund needs Upstash Redis for its rate limits: set KV_REST_API_URL and KV_REST_API_TOKEN.",
      );
    }
    return limiter.limit(bucket, identifier);
  },
  refundRequest: limiter.refund,
  clientIp,
  emailSender: getFundEmailSender,
  afterResponse: after,
});
