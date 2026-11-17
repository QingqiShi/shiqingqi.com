import "server-only";
import path from "node:path";
import { getEmailSender } from "@tuja/server-email/get-email-sender";
import type { EmailSender } from "@tuja/server-email/types";
import { DEV } from "esm-env";

/**
 * `FINANCE_EMAIL_OUTBOX` writes each email to that folder and sends nothing
 * (dev and e2e); else `RESEND_API_KEY` with `FINANCE_EMAIL_FROM` sends
 * through Resend; else `next dev` writes to `.finance-outbox`; else Finance
 * sends no email.
 */
export function getFinanceEmailSender(): EmailSender | null {
  return getEmailSender({
    appName: "Finance",
    outbox: process.env.FINANCE_EMAIL_OUTBOX,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.FINANCE_EMAIL_FROM,
    devOutbox: DEV ? path.resolve(process.cwd(), ".finance-outbox") : undefined,
  });
}
