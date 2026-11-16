import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { z } from "zod";

function isObjectWithId(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string"
  );
}

/** What the browser sends back from a passkey ceremony. The WebAuthn check reads the rest of it. */
export const passkeyResponseSchemas = {
  registration: z.custom<RegistrationResponseJSON>(isObjectWithId),
  authentication: z.custom<AuthenticationResponseJSON>(isObjectWithId),
};
