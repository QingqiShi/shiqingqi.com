import { authJson } from "@tuja/server-auth/auth-json";
import { HttpError } from "@tuja/server-auth/http-error";
import {
  makeAuth,
  type AuthRateLimitBucket,
} from "@tuja/server-auth/make-auth";
import type {
  AuthHandler,
  AuthRateLimitResult,
} from "@tuja/server-auth/make-auth-route-kit";
import { readRequestCookie } from "@tuja/server-auth/read-request-cookie";
import { makeCodeEmailBuilder } from "@tuja/server-email/make-code-email-builder";
import type { EmailSender } from "@tuja/server-email/types";
import { eq } from "drizzle-orm";
import { emailCodes, sessions, signUps, users } from "#src/db/auth-schema.ts";
import type { TripsDb } from "#src/db/types.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";
import { resolveSession } from "./resolve-session.ts";
import { tripsAuthStore } from "./trips-auth-store.ts";
import { tripsChallengeCookie } from "./trips-challenge-cookie.ts";
import { tripsEmailCodeCookie } from "./trips-email-code-cookie.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => TripsDb | null;
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
  /** Null when Trips sends no email. */
  emailSender: () => EmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

async function findUserId(tx: TripsDb, email: string) {
  const user = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  return user.at(0)?.id ?? null;
}

/** What only Trips has in the shared sign-in: a user is an email address, and no more. */
export const tripsAuthConfig = {
  appName: "Trips",
  passkeyRpId,
  postBucket: "auth",
  store: tripsAuthStore,
  transaction: <T>(db: TripsDb, run: (tx: TripsDb) => Promise<T>) =>
    db.transaction(run),
  sessionCookie: tripsSessionCookie,
  challengeCookie: tripsChallengeCookie,
  emailCodeCookie: tripsEmailCodeCookie,
  buildCodeEmail: makeCodeEmailBuilder({ en: "Trips", zh: "旅行计划" }),
  isEmailRegistered: async (tx: TripsDb, email: string) =>
    (await findUserId(tx, email)) !== null,
  findRecoveryUser: findUserId,
  passkeyName: async (tx: TripsDb, userId: string) => {
    const user = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return user.at(0)?.email ?? "Trips";
  },
  createUser: async (
    tx: TripsDb,
    { userId, email, now }: { userId: string; email: string; now: Date },
  ) => {
    const created = await tx
      .insert(users)
      .values({ id: userId, email, createdAt: now })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (created.length === 0) throw new HttpError(409, "email_registered");
    return {};
  },
  signIn: () => Promise.resolve({}),
} as const;

export type AuthHandlers = ReturnType<typeof makeTripsAuth>;

/**
 * The passkey routes: sign-in with a saved passkey; sign-up with an emailed
 * code, then a passkey; recovery of a user who lost every passkey, through a
 * code sent to the user's email; and the removal of the signed-in user.
 */
export function makeTripsAuth(deps: AuthHandlerDeps) {
  const auth = makeAuth({ ...deps, ...tripsAuthConfig });

  const deleteAccount: AuthHandler = auth.handle(async (request, context) => {
    const { db, now } = context;
    const token = readRequestCookie(request, tripsSessionCookie.name);
    const resolved = token
      ? await resolveSession(db, token, { now, allowRefresh: false })
      : null;
    if (!resolved) throw new HttpError(401, "unauthorized");
    await db.transaction(async (tx) => {
      // Recovery can end the session after the check above. The lock makes
      // recovery wait for this transaction, or shows that the session is gone.
      const live = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.id, resolved.session.sessionId))
        .for("update");
      if (live.length === 0) throw new HttpError(401, "unauthorized");
      // The passkeys, sessions and recovery links go with the user.
      const deleted = await tx
        .delete(users)
        .where(eq(users.id, resolved.session.userId))
        .returning({ email: users.email });
      const user = deleted.at(0);
      if (!user) return;
      await tx.delete(emailCodes).where(eq(emailCodes.email, user.email));
      await tx.delete(signUps).where(eq(signUps.email, user.email));
    });
    context.setCookies.push(tripsSessionCookie.clear(context.secure));
    return authJson(context, { ok: true });
  });

  return { ...auth.handlers, deleteAccount };
}
