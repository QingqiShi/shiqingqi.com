import { z } from "zod";
import { makeSealedCookie } from "./make-sealed-cookie.ts";

const challengePayloadSchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("sign-in"), challenge: z.string() }),
  z.object({
    purpose: z.literal("setup"),
    challenge: z.string(),
    userId: z.uuid(),
    mode: z.enum(["create", "claim"]),
  }),
  z.object({
    purpose: z.literal("invite"),
    challenge: z.string(),
    userId: z.uuid(),
    inviteId: z.uuid(),
  }),
  z.object({
    purpose: z.literal("add-passkey"),
    challenge: z.string(),
    userId: z.uuid(),
  }),
]);

export type ChallengePayload = z.infer<typeof challengePayloadSchema>;

export const financeChallengeCookie = makeSealedCookie({
  name: "finance_challenge",
  maxAgeSeconds: 5 * 60,
  schema: challengePayloadSchema,
});
