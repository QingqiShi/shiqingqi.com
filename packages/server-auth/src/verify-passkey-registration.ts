import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { HttpError } from "./http-error.ts";

/** The new passkey that `response` proves, or the refusal `passkey_invalid`. */
export async function verifyPasskeyRegistration(
  context: { appName: string; origin: string; rpID: string },
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: context.origin,
      expectedRPID: context.rpID,
      requireUserVerification: false,
    });
    if (verification.verified) return verification.registrationInfo.credential;
  } catch (error) {
    console.warn(
      `${context.appName} passkey registration failed:`,
      error instanceof Error ? error.message : error,
    );
  }
  throw new HttpError(400, "passkey_invalid");
}
