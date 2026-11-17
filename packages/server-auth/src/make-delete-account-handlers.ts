import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import {
  authChallenges,
  type AuthChallengePayload,
} from "./auth-challenges.ts";
import { authJson } from "./auth-json.ts";
import { HttpError } from "./http-error.ts";
import type { AuthContext, AuthHandler } from "./make-auth-route-kit.ts";
import type { AuthStore, AuthTx } from "./make-auth-store.ts";
import type { makeChallenge } from "./make-challenge.ts";
import { passkeyResponseSchemas } from "./passkey-response-schemas.ts";
import { readAuthBody } from "./read-auth-body.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { verifyPasskeySignIn } from "./verify-passkey-sign-in.ts";

const verifyBody = z.object({
  response: passkeyResponseSchemas.authentication,
});

export interface DeleteAccountHooks<Context, Tx> {
  /** The user that is signed in. Refuses a request with no session. */
  requireUser: (
    request: Request,
    context: Context,
  ) => Promise<{ userId: string }>;
  /**
   * Deletes the user and all that the app keeps for the user, in the
   * transaction of the deletion. Returns the user's email, so that the codes
   * and links sent to it end too.
   */
  deleteUser: (tx: Tx, userId: string) => Promise<{ email: string | null }>;
}

interface DeleteAccountDeps<Db, Tx extends AuthTx> {
  handle: (
    run: (request: Request, context: AuthContext<Db>) => Promise<Response>,
  ) => AuthHandler;
  challenge: ReturnType<typeof makeChallenge<AuthChallengePayload>>;
  store: AuthStore;
  transaction: <T>(db: Db, run: (tx: Tx) => Promise<T>) => Promise<T>;
  sessionCookie: { name: string; clear(secure: boolean): string };
}

/**
 * The routes that delete the account of the user that is signed in. The
 * user confirms with one of the account's passkeys, as at sign-in, and the
 * deletion of the app's data, the user and all of sign-in's rows for the
 * user is one transaction.
 */
export function makeDeleteAccountHandlers<Db, Tx extends AuthTx>(
  {
    handle,
    challenge,
    store,
    transaction,
    sessionCookie,
  }: DeleteAccountDeps<Db, Tx>,
  hooks: DeleteAccountHooks<AuthContext<Db>, Tx>,
) {
  return {
    deleteAccountOptions: handle(async (request, context) => {
      const { userId } = await hooks.requireUser(request, context);
      const allowCredentials = await transaction(context.db, (tx) =>
        store.listPasskeys(tx, userId),
      );
      const options = await generateAuthenticationOptions({
        rpID: context.rpID,
        userVerification: "preferred",
        allowCredentials,
      });
      challenge.issue(context, {
        purpose: "delete-account",
        challenge: options.challenge,
        userId,
      });
      return authJson(context, { options });
    }),

    deleteAccountVerify: handle(async (request, context) => {
      const { userId } = await hooks.requireUser(request, context);
      const { response } = await readAuthBody(request, verifyBody);
      const taken = challenge.take(
        request,
        context,
        authChallenges.deleteAccount,
      );
      if (taken.userId !== userId) {
        throw new HttpError(400, "challenge_invalid");
      }
      const passkey = await transaction(context.db, (tx) =>
        store.findPasskey(tx, response.id),
      );
      if (passkey?.userId !== userId) {
        throw new HttpError(401, "passkey_unknown");
      }
      await verifyPasskeySignIn(context, {
        response,
        challenge: taken.challenge,
        passkey,
      });
      const token = readRequestCookie(request, sessionCookie.name);
      await transaction(context.db, async (tx) => {
        // Recovery can end the session after the checks above. The lock
        // makes recovery wait for this transaction, or shows that the
        // session is gone.
        if (!token || (await store.lockSession(tx, token)) !== userId) {
          throw new HttpError(401, "unauthorized");
        }
        const { email } = await hooks.deleteUser(tx, userId);
        await store.deleteAccount(tx, { userId, email });
      });
      context.setCookies.push(sessionCookie.clear(context.secure));
      return authJson(context, { ok: true });
    }),
  };
}
