import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { uuidToBytes } from "@tuja/server-auth/uuid-to-bytes";
import { z } from "zod";
import { passkeys } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";
import { HttpError, type Context } from "./make-auth-route-kit.ts";

const RP_NAME = "Finance";

function isObjectWithId(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

export const registrationResponseSchema =
  z.custom<RegistrationResponseJSON>(isObjectWithId);
export const authenticationResponseSchema =
  z.custom<AuthenticationResponseJSON>(isObjectWithId);

export async function registrationOptions(
  context: Context,
  {
    userId,
    userName,
    excludeCredentials = [],
  }: {
    userId: string;
    userName: string;
    excludeCredentials?: { id: string; transports: string[] }[];
  },
) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: context.rpID,
    userID: uuidToBytes(userId),
    userName,
    userDisplayName: userName,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration(
  context: Context,
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
    if (verification.verified) return verification.registrationInfo;
  } catch (error) {
    console.warn(
      "Finance passkey registration failed:",
      error instanceof Error ? error.message : error,
    );
  }
  throw new HttpError(400, "passkey_invalid");
}

type RegistrationInfo = Awaited<ReturnType<typeof verifyRegistration>>;

export async function insertPasskey(
  db: FinanceAppDb,
  userId: string,
  { credential }: RegistrationInfo,
  now: Date,
) {
  const inserted = await db
    .insert(passkeys)
    .values({
      id: credential.id,
      userId,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports ?? [],
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: passkeys.id });
  if (inserted.length === 0) throw new HttpError(409, "passkey_exists");
}
