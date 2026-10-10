import "server-only";
import path from "node:path";
import { makeOutboxEmailSender } from "./make-outbox-email-sender.ts";
import { makeResendEmailSender } from "./make-resend-email-sender.ts";
import type { FinanceEmailSender } from "./types.ts";

let hasLoggedDevOutbox = false;

/**
 * `FINANCE_EMAIL_OUTBOX` writes each email to that folder and sends nothing
 * (dev and e2e); else `RESEND_API_KEY` with `FINANCE_EMAIL_FROM` sends
 * through Resend; else `next dev` writes to `.finance-outbox`; else Finance
 * sends no email.
 */
export function getFinanceEmailSender(): FinanceEmailSender | null {
  const outbox = process.env.FINANCE_EMAIL_OUTBOX;
  if (outbox) return makeOutboxEmailSender(outbox);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FINANCE_EMAIL_FROM;
  if (apiKey && from) return makeResendEmailSender({ apiKey, from });
  if (process.env.NODE_ENV === "development") {
    const devOutbox = path.resolve(process.cwd(), ".finance-outbox");
    if (!hasLoggedDevOutbox) {
      hasLoggedDevOutbox = true;
      console.info(`Finance emails are written to ${devOutbox}`);
    }
    return makeOutboxEmailSender(devOutbox);
  }
  return null;
}
