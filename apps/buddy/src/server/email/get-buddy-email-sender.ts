import "server-only";
import path from "node:path";
import { makeOutboxEmailSender } from "./make-outbox-email-sender.ts";
import { makeResendEmailSender } from "./make-resend-email-sender.ts";
import type { BuddyEmailSender } from "./types.ts";

let hasLoggedDevOutbox = false;

/**
 * `BUDDY_EMAIL_OUTBOX` writes each email to that folder and sends nothing
 * (dev and tests); else `RESEND_API_KEY` with `BUDDY_EMAIL_FROM` sends
 * through Resend; else `next dev` writes to `.buddy-outbox`; else Buddy
 * sends no email.
 */
export function getBuddyEmailSender(): BuddyEmailSender | null {
  const outbox = process.env.BUDDY_EMAIL_OUTBOX;
  if (outbox) return makeOutboxEmailSender(outbox);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BUDDY_EMAIL_FROM;
  if (apiKey && from) return makeResendEmailSender({ apiKey, from });
  if (process.env.NODE_ENV === "development") {
    const devOutbox = path.resolve(process.cwd(), ".buddy-outbox");
    if (!hasLoggedDevOutbox) {
      hasLoggedDevOutbox = true;
      console.info(`Buddy emails are written to ${devOutbox}`);
    }
    return makeOutboxEmailSender(devOutbox);
  }
  return null;
}
