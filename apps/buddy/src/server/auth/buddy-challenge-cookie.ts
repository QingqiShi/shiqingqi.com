import { z } from "zod";
import { makeSealedCookie } from "./make-sealed-cookie.ts";

const challengePayloadSchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("sign-in"), challenge: z.string() }),
  z.object({
    purpose: z.literal("sign-up"),
    challenge: z.string(),
    userId: z.uuid(),
    signUpId: z.uuid(),
  }),
  z.object({
    purpose: z.literal("recovery"),
    challenge: z.string(),
    userId: z.uuid(),
    recoveryId: z.uuid(),
  }),
]);

export type ChallengePayload = z.infer<typeof challengePayloadSchema>;

export const buddyChallengeCookie = makeSealedCookie({
  name: "buddy_challenge",
  maxAgeSeconds: 5 * 60,
  schema: challengePayloadSchema,
});
