import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { uuidToBytes } from "@tuja/server-auth/uuid-to-bytes";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { accounts, passkeys } from "#src/server/db/schema.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { deleteSession } from "./delete-session.ts";
import {
  HttpError,
  issueChallenge,
  json,
  openSession,
  readBody,
  takeChallenge,
  type AuthRouteKit,
} from "./make-auth-route-kit.ts";
import { authenticationResponseSchema } from "./verify-registration.ts";

const authenticationVerifyBody = z.object({
  response: authenticationResponseSchema,
});

export function makeSignInHandlers({ handle }: AuthRouteKit) {
  return {
    signInOptions: handle(async (_request, context) => {
      const options = await generateAuthenticationOptions({
        rpID: context.rpID,
        userVerification: "preferred",
      });
      issueChallenge(context, {
        purpose: "sign-in",
        challenge: options.challenge,
      });
      return json(context, { options });
    }),

    /** Answers with the account's name, so that the page can go to the account's pet. */
    signInVerify: handle(async (request, context) => {
      const { response } = await readBody(request, authenticationVerifyBody);
      const { challenge } = takeChallenge(request, context, "sign-in");

      const passkey = (
        await context.db
          .select({
            id: passkeys.id,
            userId: passkeys.userId,
            publicKey: passkeys.publicKey,
            counter: passkeys.counter,
            transports: passkeys.transports,
            name: accounts.name,
          })
          .from(passkeys)
          .innerJoin(accounts, eq(accounts.id, passkeys.userId))
          .where(eq(passkeys.id, response.id))
          .limit(1)
      ).at(0);
      if (!passkey) throw new HttpError(401, "passkey_unknown");
      const userHandle = response.response.userHandle;
      if (
        userHandle !== undefined &&
        userHandle !==
          Buffer.from(uuidToBytes(passkey.userId)).toString("base64url")
      ) {
        throw new HttpError(401, "passkey_unknown");
      }

      let newCounter: number;
      try {
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: context.origin,
          expectedRPID: context.rpID,
          requireUserVerification: false,
          credential: {
            id: passkey.id,
            publicKey: new Uint8Array(passkey.publicKey),
            counter: passkey.counter,
            transports: passkey.transports,
          },
        });
        if (!verification.verified) throw new Error("not verified");
        newCounter = verification.authenticationInfo.newCounter;
      } catch (error) {
        console.warn(
          "Buddy passkey sign-in failed:",
          error instanceof Error ? error.message : error,
        );
        throw new HttpError(401, "passkey_invalid");
      }

      await context.db.transaction(async (db) => {
        await db
          .update(passkeys)
          .set({ counter: newCounter, lastUsedAt: context.now })
          .where(eq(passkeys.id, passkey.id));
        await openSession(db, request, context, passkey.userId);
      });
      return json(context, { name: passkey.name });
    }),

    signOut: handle(async (request, context) => {
      const token = readRequestCookie(request, buddySessionCookie.name);
      if (token) await deleteSession(context.db, token);
      context.setCookies.push(buddySessionCookie.clear(context.secure));
      return json(context, { ok: true });
    }),
  };
}
