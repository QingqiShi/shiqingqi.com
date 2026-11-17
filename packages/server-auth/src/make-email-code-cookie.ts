import { z } from "zod";
import { EMAIL_CODE_LIMITS } from "./email-code-limits.ts";
import { makeSealedCookie } from "./make-sealed-cookie.ts";

const emailCodePayloadSchema = z.object({
  purpose: z.enum(["recovery", "sign-up", "email-change"]),
  codeId: z.uuid(),
  /** The signed-in user who asked for the code, when the flow has one. */
  userId: z.uuid().optional(),
});

export type EmailCodePayload = z.infer<typeof emailCodePayloadSchema>;

/** Binds an emailed code to the browser that asked for it: a code is checked only against the request whose id this cookie holds. */
export function makeEmailCodeCookie(name: string) {
  return makeSealedCookie({
    name,
    maxAgeSeconds: EMAIL_CODE_LIMITS.lifetimeMs / 1000,
    schema: emailCodePayloadSchema,
  });
}
