import { HttpError } from "@tuja/server-auth/http-error";
import {
  makeAuth,
  type AuthRateLimitBucket,
} from "@tuja/server-auth/make-auth";
import type {
  AuthContext,
  AuthRateLimitResult,
} from "@tuja/server-auth/make-auth-route-kit";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { makeCodeEmailBuilder } from "@tuja/server-email/make-code-email-builder";
import type { EmailSender } from "@tuja/server-email/types";
import { and, eq, ne } from "drizzle-orm";
import { users } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantAuthStore } from "./assistant-auth-store.ts";
import { assistantChallengeCookie } from "./assistant-challenge-cookie.ts";
import { assistantEmailCodeCookie } from "./assistant-email-code-cookie.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";
import { resolveSession } from "./resolve-session.ts";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => AssistantDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  isAllowedOrigin: (origin: string) => boolean;
  /** Counts one request of `identifier` against the limit of `bucket`. */
  limitRequest: (
    bucket: AuthRateLimitBucket,
    identifier: string,
  ) => Promise<AuthRateLimitResult>;
  /** Gives back one request of `identifier` that `bucket` counted. */
  refundRequest: (
    bucket: AuthRateLimitBucket,
    identifier: string,
  ) => Promise<void>;
  clientIp: (request: Request) => string;
  /** Null when Assistant sends no email. */
  emailSender: () => EmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

async function findUserId(tx: AssistantDb, email: string) {
  const user = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  return user.at(0)?.id ?? null;
}

/**
 * What only Assistant has in the shared sign-in. The app is the owner's
 * alone until the owner opens it, so no request makes a user and no email
 * gets a person in: there is no sign-up and no recovery.
 */
export const assistantAuthConfig = {
  appName: "Qi Assistant",
  passkeyRpId,
  postBucket: "auth",
  store: assistantAuthStore,
  transaction: <T>(db: AssistantDb, run: (tx: AssistantDb) => Promise<T>) =>
    db.transaction(run),
  sessionCookie: assistantSessionCookie,
  challengeCookie: assistantChallengeCookie,
  emailCodeCookie: assistantEmailCodeCookie,
  buildCodeEmail: makeCodeEmailBuilder({
    en: "Qi Assistant",
    zh: "Qi Assistant",
  }),
  isEmailRegistered: async (tx: AssistantDb, email: string) =>
    (await findUserId(tx, email)) !== null,
  findRecoveryUser: () => Promise.resolve(null),
  passkeyName: async (tx: AssistantDb, userId: string) => {
    const user = await tx
      .select({ email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId));
    const found = user.at(0);
    return found?.email ?? found?.displayName ?? "Qi Assistant";
  },
  createUser: () => Promise.reject(new HttpError(403, "sign_up_closed")),
  signIn: () => Promise.resolve({ ok: true }),
} as const;

/** The user of the request's session. Refuses a request with no live session. */
async function requireUser(
  request: Request,
  { db, now }: AuthContext<AssistantDb>,
): Promise<{ userId: string }> {
  const token = readRequestCookie(request, assistantSessionCookie.name);
  const resolved = token
    ? await resolveSession(db, token, { now, allowRefresh: false })
    : null;
  if (!resolved) throw new HttpError(401, "unauthorized");
  return { userId: resolved.session.userId };
}

export type AssistantAuthHandlers = ReturnType<typeof makeAssistantAuth>;

/**
 * The auth routes of Assistant: sign-in with a saved passkey, sign-out, and,
 * for the signed-in user, one more passkey and the email by an emailed code.
 * The shared sign-up and recovery routes are left out.
 */
export function makeAssistantAuth(deps: AuthHandlerDeps) {
  const auth = makeAuth({ ...deps, ...assistantAuthConfig });
  const { signInOptions, signInVerify, signOut } = auth.handlers;
  return {
    signInOptions,
    signInVerify,
    signOut,
    ...auth.addPasskeyHandlers({ requireUser }),
    ...auth.emailChangeHandlers({
      requireUser,
      changeEmail: async (tx, { userId, email }) => {
        const taken = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, userId)));
        if (taken.length > 0) return false;
        await tx.update(users).set({ email }).where(eq(users.id, userId));
        return true;
      },
    }),
  };
}
