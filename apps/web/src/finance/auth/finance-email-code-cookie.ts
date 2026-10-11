import { z } from "zod";
import { makeSealedCookie } from "./make-sealed-cookie.ts";
import { EMAIL_CODE_LIFETIME_MS } from "./start-email-code.ts";

const emailCodePayloadSchema = z.object({
  purpose: z.enum(["recovery"]),
  codeId: z.uuid(),
});

export type EmailCodePayload = z.infer<typeof emailCodePayloadSchema>;

/** Binds an emailed code to the browser that asked for it: a code is checked only against the request whose id this cookie holds. */
export const financeEmailCodeCookie = makeSealedCookie({
  name: "finance_email_code",
  maxAgeSeconds: EMAIL_CODE_LIFETIME_MS / 1000,
  schema: emailCodePayloadSchema,
});
