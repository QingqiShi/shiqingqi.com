import { after } from "next/server";
import "server-only";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { getBuddyEmailSender } from "../email/get-buddy-email-sender.ts";
import { clientIp } from "../http/client-ip.ts";
import { withinRateLimit } from "../http/within-rate-limit.ts";
import { getBuddyBackend } from "../store/get-buddy-backend.ts";
import { getAuthSecret } from "./get-auth-secret.ts";
import { isAllowedBuddyOrigin } from "./is-allowed-buddy-origin.ts";
import { makeAuthHandlers } from "./make-auth-handlers.ts";
import { AUTH_RATE_LIMITS } from "./make-auth-route-kit.ts";

export const authHandlers = makeAuthHandlers({
  getDb: getBuddyDb,
  now: () => new Date(),
  authSecret: getAuthSecret,
  isAllowedOrigin: isAllowedBuddyOrigin,
  limitRequest: (bucket, identifier) =>
    withinRateLimit(
      getBuddyBackend().kv,
      `auth:${bucket}:${identifier}`,
      AUTH_RATE_LIMITS[bucket],
    ),
  clientIp,
  emailSender: getBuddyEmailSender,
  afterResponse: after,
});
