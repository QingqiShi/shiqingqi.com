import { Resend } from "resend";
import type { FinanceEmailSender } from "./types.ts";

export function makeResendEmailSender({
  apiKey,
  from,
}: {
  apiKey: string;
  from: string;
}): FinanceEmailSender {
  const resend = new Resend(apiKey);
  return {
    async send({ to, subject, text, html }) {
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
        html,
      });
      if (error) {
        throw new Error(`Resend refused the email: ${error.message}`);
      }
    },
  };
}
