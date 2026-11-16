import { generateRegistrationOptions } from "@simplewebauthn/server";
import { uuidToBytes } from "./uuid-to-bytes.ts";

/** The options for the browser to make a passkey for the user. */
export function passkeyRegistrationOptions(
  context: { appName: string; rpID: string },
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
    rpName: context.appName,
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
