import "server-only";
import path from "node:path";
import { getEmailSender } from "@tuja/server-email/get-email-sender";
import type { EmailSender } from "@tuja/server-email/types";
import { DEV } from "esm-env";

/**
 * `FUND_EMAIL_OUTBOX` writes each email to that folder and sends nothing;
 * else `RESEND_API_KEY` with `FUND_EMAIL_FROM` sends through Resend; else
 * `next dev` writes to `.fund-outbox`; else the fund sends no email.
 */
export function getFundEmailSender(): EmailSender | null {
  return getEmailSender({
    appName: "Paper Fund",
    outbox: process.env.FUND_EMAIL_OUTBOX,
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.FUND_EMAIL_FROM,
    devOutbox: DEV ? path.resolve(process.cwd(), ".fund-outbox") : undefined,
  });
}
