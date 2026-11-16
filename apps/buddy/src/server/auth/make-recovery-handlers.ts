import { authBodies } from "@tuja/server-auth/auth-bodies";
import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import { makeChallenge } from "@tuja/server-auth/make-challenge";
import { passkeyRegistrationOptions } from "@tuja/server-auth/passkey-registration-options";
import { passkeyResponseSchemas } from "@tuja/server-auth/passkey-response-schemas";
import { readAuthBody } from "@tuja/server-auth/read-auth-body";
import { verifyPasskeyRegistration } from "@tuja/server-auth/verify-passkey-registration";
import { buddyAuthStore } from "./buddy-auth-store.ts";
import {
  buddyChallengeCookie,
  recoveryChallenge,
} from "./buddy-challenge-cookie.ts";
import { consumeRecovery, lookupRecovery } from "./create-email-recovery.ts";
import type { BuddyAuth } from "./make-buddy-auth.ts";

const challenge = makeChallenge(buddyChallengeCookie);

const recoveryVerifyBody = authBodies.token.extend({
  response: passkeyResponseSchemas.registration,
});

/** The routes that save a new passkey from a recovery link. */
export function makeRecoveryHandlers({
  handle,
  createSession,
  startSession,
}: BuddyAuth) {
  return {
    recoveryOptions: handle(async (request, context) => {
      const { token } = await readAuthBody(request, authBodies.token);
      const recovery = await lookupRecovery(context.db, token, context.now);
      if (!recovery) throw new HttpError(410, "recovery_invalid");
      const options = await passkeyRegistrationOptions(context, {
        userId: recovery.userId,
        userName: recovery.email,
      });
      challenge.issue(context, {
        purpose: "recovery",
        challenge: options.challenge,
        userId: recovery.userId,
        recoveryId: recovery.recoveryId,
      });
      return authJson(context, { options });
    }),

    recoveryVerify: handle(async (request, context) => {
      const body = await readAuthBody(request, recoveryVerifyBody);
      const taken = challenge.take(request, context, recoveryChallenge);
      const { userId, recoveryId } = taken;
      const { now } = context;
      const recovery = await lookupRecovery(context.db, body.token, now);
      if (recovery?.recoveryId !== recoveryId || recovery.userId !== userId) {
        throw new HttpError(410, "recovery_invalid");
      }
      const credential = await verifyPasskeyRegistration(
        context,
        body.response,
        taken.challenge,
      );
      const token = await context.db.transaction(async (db) => {
        if (!(await consumeRecovery(db, { recoveryId, now }))) {
          throw new HttpError(410, "recovery_invalid");
        }
        await buddyAuthStore.revokeUserAccess(db, userId);
        await buddyAuthStore.insertPasskey(db, userId, credential, now);
        return createSession(db, request, context, userId);
      });
      startSession(context, token);
      return authJson(context, { name: recovery.name });
    }),
  };
}
