import { z } from "zod";
import { makeSealedCookie } from "./make-sealed-cookie.ts";

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
