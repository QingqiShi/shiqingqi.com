import {
  makeAuthRouteKit,
  type AuthHandlerDeps,
  type Handler,
} from "./make-auth-route-kit.ts";
import { makeInviteHandlers } from "./make-invite-handlers.ts";
import { makeRecoveryHandlers } from "./make-recovery-handlers.ts";
import { makeSignInHandlers } from "./make-sign-in-handlers.ts";
import { makeSignUpHandlers } from "./make-sign-up-handlers.ts";

export type { AuthHandlerDeps };

export interface AuthHandlers {
  signInOptions: Handler;
  signInVerify: Handler;
  requestSignUp: Handler;
  signUpCode: Handler;
  signUpOptions: Handler;
  signUpVerify: Handler;
  inviteOptions: Handler;
  inviteVerify: Handler;
  createInvite: Handler;
  passkeyOptions: Handler;
  passkeyVerify: Handler;
  recoveryEmail: Handler;
  setRecoveryEmail: Handler;
  verifyEmail: Handler;
  requestRecovery: Handler;
  recoveryCode: Handler;
  signOut: Handler;
  session: Handler;
  startDemo: Handler;
}

export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  const kit = makeAuthRouteKit(deps);
  return {
    ...makeSignInHandlers(kit),
    ...makeSignUpHandlers(kit),
    ...makeInviteHandlers(kit, deps),
    ...makeRecoveryHandlers(kit, deps),
  };
}
