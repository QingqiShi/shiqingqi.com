import { z } from "zod";

/**
 * The challenge payloads of the ceremonies that every app has. An app puts
 * them in the union of its challenge cookie, beside those of its own
 * ceremonies.
 */
export const authChallenges = {
  signIn: z.object({ purpose: z.literal("sign-in"), challenge: z.string() }),
  signUp: z.object({
    purpose: z.literal("sign-up"),
    challenge: z.string(),
    userId: z.uuid(),
    signUpId: z.uuid(),
  }),
  addPasskey: z.object({
    purpose: z.literal("add-passkey"),
    challenge: z.string(),
    userId: z.uuid(),
  }),
};

export type AuthChallengePayload =
  | z.infer<typeof authChallenges.signIn>
  | z.infer<typeof authChallenges.signUp>
  | z.infer<typeof authChallenges.addPasskey>;
