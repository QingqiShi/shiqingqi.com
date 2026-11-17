import type { AuthRateLimitBucket } from "@tuja/server-auth/make-auth";
import { makeRateLimiter } from "@tuja/server-clients/make-rate-limiter";
import { ipAddress } from "@vercel/functions";
import { after } from "next/server";
import "server-only";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import { getAssistantEmailSender } from "#src/assistant/email/get-assistant-email-sender.ts";
import { isAllowedAssistantOrigin } from "./is-allowed-assistant-origin.ts";
import { makeAssistantAuth } from "./make-assistant-auth.ts";

function hasRedis() {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

/** The limits of sign-in. Without Redis they are off, which only a local server permits. */
const limiter = makeRateLimiter<AuthRateLimitBucket>({
  prefix: "assistant:rate:auth",
  limits: {
    auth: { tokens: 10, window: "60 s" },
    "recovery-email-ip": { tokens: 10, window: "1 h" },
    "recovery-email-address": { tokens: 3, window: "1 h" },
    "sign-up-ip": { tokens: 10, window: "1 h" },
    "sign-up-address": { tokens: 3, window: "1 h" },
  },
  isOn: hasRedis,
});

export const authHandlers = makeAssistantAuth({
  getDb: () => (isAssistantConfigured() ? getAssistantDb() : null),
  now: () => new Date(),
  authSecret: () => process.env.ASSISTANT_AUTH_SECRET,
  isAllowedOrigin: isAllowedAssistantOrigin,
  limitRequest: (bucket, identifier) => {
    if (process.env.VERCEL_URL && !hasRedis()) {
      throw new Error(
        "Assistant needs Upstash Redis for its rate limits: set KV_REST_API_URL and KV_REST_API_TOKEN.",
      );
    }
    return limiter.limit(bucket, identifier);
  },
  refundRequest: limiter.refund,
  // Local requests share one bucket.
  clientIp: (request) => ipAddress(request) ?? "local",
  emailSender: getAssistantEmailSender,
  afterResponse: after,
});
