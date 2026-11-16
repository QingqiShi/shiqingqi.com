import type { AuthRateLimitBucket } from "@tuja/server-auth/make-auth";
import { makeRateLimiter } from "@tuja/server-clients/make-rate-limiter";
import { after } from "next/server";
import "server-only";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { getBuddyEmailSender } from "../email/get-buddy-email-sender.ts";
import { clientIp } from "../http/client-ip.ts";
import { getBuddyBackend } from "../store/get-buddy-backend.ts";
import { getAuthSecret } from "./get-auth-secret.ts";
import { isAllowedBuddyOrigin } from "./is-allowed-buddy-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";

/** The limits of Finance's sign-in. They are off where the store is in memory: local dev and tests. */
const limiter = makeRateLimiter<AuthRateLimitBucket>({
  prefix: "buddy:rate:auth",
  limits: {
    auth: { tokens: 10, window: "60 s" },
    "recovery-email-ip": { tokens: 10, window: "1 h" },
    "recovery-email-address": { tokens: 3, window: "1 h" },
    "sign-up-ip": { tokens: 10, window: "1 h" },
    "sign-up-address": { tokens: 3, window: "1 h" },
  },
  isOn: () => !getBuddyBackend().inMemory,
});

export const authHandlers = makeAuthHandlers({
  getDb: getBuddyDb,
  now: () => new Date(),
  authSecret: getAuthSecret,
  isAllowedOrigin: isAllowedBuddyOrigin,
  limitRequest: limiter.limit,
  refundRequest: limiter.refund,
  clientIp,
  emailSender: getBuddyEmailSender,
  afterResponse: after,
});
