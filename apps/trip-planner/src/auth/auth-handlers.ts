import type { AuthRateLimitBucket } from "@tuja/server-auth/make-auth";
import { makeRateLimiter } from "@tuja/server-clients/make-rate-limiter";
import { after } from "next/server";
import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { getTripsEmailSender } from "#src/email/get-trips-email-sender.ts";
import { clientIp } from "./client-ip.ts";
import { getAuthSecret } from "./get-auth-secret.ts";
import { isAllowedTripsOrigin } from "./is-allowed-trips-origin.ts";
import { makeTripsAuth } from "./make-trips-auth.ts";

function hasRedis() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

/** The limits of Finance's sign-in. Without Redis they are off, which only a local server permits. */
const limiter = makeRateLimiter<AuthRateLimitBucket>({
  prefix: "trips:rate:auth",
  limits: {
    auth: { tokens: 10, window: "60 s" },
    "recovery-email-ip": { tokens: 10, window: "1 h" },
    "recovery-email-address": { tokens: 3, window: "1 h" },
    "sign-up-ip": { tokens: 10, window: "1 h" },
    "sign-up-address": { tokens: 3, window: "1 h" },
  },
  isOn: hasRedis,
});

export const authHandlers = makeTripsAuth({
  getDb: () => (process.env.TRIPS_DATABASE_URL ? getTripsDb() : null),
  now: () => new Date(),
  authSecret: getAuthSecret,
  isAllowedOrigin: isAllowedTripsOrigin,
  limitRequest: (bucket, identifier) => {
    // Sign-up is open to everyone, so a deployment never answers without a limit.
    if (process.env.VERCEL_URL && !hasRedis()) {
      throw new Error(
        "Trips needs Upstash Redis for its rate limits: set KV_REST_API_URL and KV_REST_API_TOKEN.",
      );
    }
    return limiter.limit(bucket, identifier);
  },
  refundRequest: limiter.refund,
  clientIp,
  emailSender: getTripsEmailSender,
  afterResponse: after,
});
