import { makeEmailCodeCookie } from "@tuja/server-auth/make-email-code-cookie";

export const assistantEmailCodeCookie = makeEmailCodeCookie(
  "assistant_email_code",
);
