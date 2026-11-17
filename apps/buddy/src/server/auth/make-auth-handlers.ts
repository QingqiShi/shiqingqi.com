import { HttpError } from "@tuja/server-auth/http-error";
import type {
  AuthContext,
  AuthHandler,
} from "@tuja/server-auth/make-auth-route-kit";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { and, eq, ne } from "drizzle-orm";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { makeBuddyAuth, type AuthHandlerDeps } from "./make-buddy-auth.ts";
import { resolveSession } from "./resolve-session.ts";

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
  passkeyOptions: AuthHandler;
  passkeyVerify: AuthHandler;
  emailRequest: AuthHandler;
  emailVerify: AuthHandler;
}

/** The account of the session cookie. Refuses a request with no live session. */
async function requireUser(
  request: Request,
  { db, now }: AuthContext<BuddyDb>,
) {
  const token = readRequestCookie(request, buddySessionCookie.name);
  const resolved = token
    ? await resolveSession(db, token, { now, allowRefresh: false })
    : null;
  if (!resolved) throw new HttpError(401, "unauthorized");
  return { userId: resolved.session.userId };
}

/** Gives the account `email`. False when another account has it. */
async function changeEmail(
  tx: BuddyDb,
  { userId, email }: { userId: string; email: string },
) {
  const taken = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.email, email), ne(accounts.id, userId)));
  if (taken.length > 0) return false;
  await tx.update(accounts).set({ email }).where(eq(accounts.id, userId));
  return true;
}

/**
 * The passkey routes: sign-in with a saved passkey; sign-up with an emailed
 * code, then a passkey; recovery of an account that lost its passkeys
 * through a code sent to its email; and, for the signed-in account, one more
 * passkey and a new email by an emailed code.
 */
export function makeAuthHandlers(deps: AuthHandlerDeps): AuthHandlers {
  const auth = makeBuddyAuth(deps);
  return {
    ...auth.handlers,
    ...auth.addPasskeyHandlers({ requireUser }),
    ...auth.emailChangeHandlers({ requireUser, changeEmail }),
  };
}
