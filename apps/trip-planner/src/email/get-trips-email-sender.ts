import "server-only";
import path from "node:path";
import { getEmailSender } from "@tuja/server-email/get-email-sender";
import type { EmailSender } from "@tuja/server-email/types";
import { DEV } from "esm-env";

/**
 * `TRIPS_EMAIL_OUTBOX` writes each email to that folder and sends nothing
 * (dev and e2e); else `RESEND_API_KEY` with `TRIPS_EMAIL_FROM` sends through
 * Resend; else `next dev` writes to `.trips-outbox`; else Trips sends no
 * email.
 */
export function getTripsEmailSender(): EmailSender | null {
  return getEmailSender({
    appName: "Trips",
    outbox: process.env.TRIPS_EMAIL_OUTBOX,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.TRIPS_EMAIL_FROM,
    devOutbox: DEV ? path.resolve(process.cwd(), ".trips-outbox") : undefined,
  });
}
