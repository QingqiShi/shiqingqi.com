import type { AuthHandler } from "@tuja/server-auth/make-auth-route-kit";
import { makeFinanceAuth, type AuthHandlerDeps } from "./make-finance-auth.ts";
import { makeInviteHandlers } from "./make-invite-handlers.ts";
import { makeRecoveryEmailHandlers } from "./make-recovery-email-handlers.ts";
import { makeSessionHandlers } from "./make-session-handlers.ts";

export type { AuthHandlerDeps };

export interface AuthHandlers {
  signInOptions: AuthHandler;
  signInVerify: AuthHandler;
  requestSignUp: AuthHandler;
  signUpCode: AuthHandler;
  signUpOptions: AuthHandler;
  signUpVerify: AuthHandler;
  inviteOptions: AuthHandler;
  inviteVerify: AuthHandler;
  createInvite: AuthHandler;
  passkeyOptions: AuthHandler;
  passkeyVerify: AuthHandler;
  recoveryEmail: AuthHandler;
  setRecoveryEmail: AuthHandler;
  verifyEmail: AuthHandler;
  requestRecovery: AuthHandler;
  recoveryCode: AuthHandler;
  recoveryOptions: AuthHandler;
  recoveryVerify: AuthHandler;
  signOut: AuthHandler;
  session: AuthHandler;
  startDemo: AuthHandler;
}

export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  const auth = makeFinanceAuth(deps);
  return {
    ...auth.handlers,
    ...makeSessionHandlers(auth),
    ...makeInviteHandlers(auth, deps),
    ...makeRecoveryEmailHandlers(auth, deps),
  };
}
