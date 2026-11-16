import { authChallenges } from "@tuja/server-auth/auth-challenges";
import { makeSealedCookie } from "@tuja/server-auth/make-sealed-cookie";
import { z } from "zod";

export const recoveryChallenge = z.object({
  purpose: z.literal("recovery"),
  challenge: z.string(),
  userId: z.uuid(),
  recoveryId: z.uuid(),
});

export const buddyChallengeCookie = makeSealedCookie({
  name: "buddy_challenge",
  maxAgeSeconds: 5 * 60,
  schema: z.discriminatedUnion("purpose", [
    authChallenges.signIn,
    authChallenges.signUp,
    authChallenges.addPasskey,
    recoveryChallenge,
  ]),
});
