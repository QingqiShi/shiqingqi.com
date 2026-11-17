import "server-only";
import path from "node:path";
import { getEmailSender } from "@tuja/server-email/get-email-sender";
import type { EmailSender } from "@tuja/server-email/types";
import { DEV } from "esm-env";

/**
 * `BUDDY_EMAIL_OUTBOX` writes each email to that folder and sends nothing
 * (dev and tests); else `RESEND_API_KEY` with `BUDDY_EMAIL_FROM` sends
 * through Resend; else `next dev` writes to `.buddy-outbox`; else Buddy
 * sends no email.
 */
export function getBuddyEmailSender(): EmailSender | null {
  return getEmailSender({
    appName: "Buddy",
    outbox: process.env.BUDDY_EMAIL_OUTBOX,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.BUDDY_EMAIL_FROM,
    devOutbox: DEV ? path.resolve(process.cwd(), ".buddy-outbox") : undefined,
  });
}
