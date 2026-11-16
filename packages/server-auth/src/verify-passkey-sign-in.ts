import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { HttpError } from "./http-error.ts";
import type { StoredPasskey } from "./make-auth-store.ts";
import { uuidToBytes } from "./uuid-to-bytes.ts";

/** The new counter of `passkey` when `response` proves it, or a refusal. */
export async function verifyPasskeySignIn(
  context: { appName: string; origin: string; rpID: string },
  {
    response,
    challenge,
    passkey,
  }: {
    response: AuthenticationResponseJSON;
    challenge: string;
    passkey: StoredPasskey;
  },
): Promise<number> {
  const userHandle = response.response.userHandle;
  if (
    userHandle !== undefined &&
    userHandle !==
      Buffer.from(uuidToBytes(passkey.userId)).toString("base64url")
  ) {
    throw new HttpError(401, "passkey_unknown");
  }
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
    return verification.authenticationInfo.newCounter;
  } catch (error) {
    console.warn(
      `${context.appName} passkey sign-in failed:`,
      error instanceof Error ? error.message : error,
    );
    throw new HttpError(401, "passkey_invalid");
  }
}
