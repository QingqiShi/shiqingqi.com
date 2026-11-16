import { authChallenges } from "@tuja/server-auth/auth-challenges";
import { makeSealedCookie } from "@tuja/server-auth/make-sealed-cookie";
import { z } from "zod";

export const financeChallengeCookie = makeSealedCookie({
  name: "finance_challenge",
  maxAgeSeconds: 5 * 60,
  schema: z.discriminatedUnion("purpose", [
    authChallenges.signIn,
    authChallenges.signUp,
    authChallenges.addPasskey,
    authChallenges.recovery,
  ]),
});
