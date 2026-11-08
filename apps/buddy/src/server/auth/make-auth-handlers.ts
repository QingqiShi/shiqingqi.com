import {
  makeAuthRouteKit,
  type AuthHandlerDeps,
  type Handler,
} from "./make-auth-route-kit.ts";
import { makeRecoveryHandlers } from "./make-recovery-handlers.ts";
import { makeSignInHandlers } from "./make-sign-in-handlers.ts";
import { makeSignUpHandlers } from "./make-sign-up-handlers.ts";

export type { AuthHandlerDeps };

export interface AuthHandlers {
  signInOptions: Handler;
  signInVerify: Handler;
  signOut: Handler;
  session: Handler;
  requestSignUp: Handler;
  signUpCode: Handler;
  signUpOptions: Handler;
  signUpVerify: Handler;
  requestRecovery: Handler;
  recoveryCode: Handler;
  recoveryOptions: Handler;
  recoveryVerify: Handler;
}

/**
 * The passkey routes, as in Finance: sign-in with a saved passkey; sign-up
 * with an emailed code, then a passkey; and recovery of an account that
 * lost its passkeys through a code sent to its email.
 */
export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  const kit = makeAuthRouteKit(deps);
  return {
    ...makeSignInHandlers(kit),
    ...makeSignUpHandlers(kit),
    ...makeRecoveryHandlers(kit),
  };
}
