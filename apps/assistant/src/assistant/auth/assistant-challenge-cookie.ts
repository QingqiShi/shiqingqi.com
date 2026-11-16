import { makeSealedCookie } from "@tuja/server-auth/make-sealed-cookie";
import { z } from "zod";

const challengePayloadSchema = z.object({
  purpose: z.literal("sign-in"),
  challenge: z.string(),
});

export type ChallengePayload = z.infer<typeof challengePayloadSchema>;

export const assistantChallengeCookie = makeSealedCookie({
  name: "assistant_challenge",
  maxAgeSeconds: 5 * 60,
  schema: challengePayloadSchema,
});
