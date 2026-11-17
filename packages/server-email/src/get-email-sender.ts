import { makeOutboxEmailSender } from "./make-outbox-email-sender.ts";
import { makeResendEmailSender } from "./make-resend-email-sender.ts";
import type { EmailSender } from "./types.ts";

const loggedDevOutboxes = new Set<string>();

/**
 * The sender of an app. With `outbox`, each email is written to that folder
 * and nothing is sent (dev and tests); else `apiKey` with `from` sends
 * through Resend; else, with `devOutbox`, each email is written to that
 * folder; else the app sends no email.
 */
export function getEmailSender({
  appName,
  outbox,
  apiKey,
  from,
  devOutbox,
}: {
  /** For the line that says where the emails of `next dev` go. */
  appName: string;
  outbox: string | undefined;
  apiKey: string | undefined;
  from: string | undefined;
  /** Give it only under `next dev`. */
  devOutbox: string | undefined;
}): EmailSender | null {
  if (outbox) return makeOutboxEmailSender(outbox);
  if (apiKey && from) return makeResendEmailSender({ apiKey, from });
  if (devOutbox) {
    if (!loggedDevOutboxes.has(devOutbox)) {
      loggedDevOutboxes.add(devOutbox);
      console.info(`${appName} emails are written to ${devOutbox}`);
    }
    return makeOutboxEmailSender(devOutbox);
  }
  return null;
}
