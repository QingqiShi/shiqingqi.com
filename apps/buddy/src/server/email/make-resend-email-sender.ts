import type { BuddyEmailSender } from "./types.ts";

export function makeResendEmailSender({
  apiKey,
  from,
}: {
  apiKey: string;
  from: string;
}): BuddyEmailSender {
  return {
    async send({ to, subject, text, html }) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, text, html }),
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : response.statusText;
        throw new Error(`Resend refused the email: ${message}`);
      }
    },
  };
}
