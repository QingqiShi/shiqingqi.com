import type { AuthHandler } from "@tuja/server-auth/make-auth-route-kit";
import { makeBuddyAuth, type AuthHandlerDeps } from "./make-buddy-auth.ts";

export type { AuthHandlerDeps };

export interface AuthHandlers {
  signInOptions: AuthHandler;
  signInVerify: AuthHandler;
  signOut: AuthHandler;
  requestSignUp: AuthHandler;
  signUpCode: AuthHandler;
  signUpOptions: AuthHandler;
  signUpVerify: AuthHandler;
  requestRecovery: AuthHandler;
  recoveryCode: AuthHandler;
  recoveryOptions: AuthHandler;
  recoveryVerify: AuthHandler;
}

/**
 * The passkey routes: sign-in with a saved passkey; sign-up with an emailed
 * code, then a passkey; and recovery of an account that lost its passkeys
 * through a code sent to its email.
 */
export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  return makeBuddyAuth(deps).handlers;
}
