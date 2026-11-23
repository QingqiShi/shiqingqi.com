import { authBodies } from "@tuja/server-auth/auth-bodies";
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
import { runTransaction } from "@tuja/server-db/run-transaction";
import { makeCodeEmailBuilder } from "@tuja/server-email/make-code-email-builder";
import type { EmailSender } from "@tuja/server-email/types";
import { and, eq, ne } from "drizzle-orm";
import { users } from "#src/db/auth-schema.ts";
import type { FundDb } from "#src/db/types.ts";
import { fundAuthStore } from "./fund-auth-store.ts";
import { fundChallengeCookie } from "./fund-challenge-cookie.ts";
import { fundEmailCodeCookie } from "./fund-email-code-cookie.ts";
import { fundSessionCookie } from "./fund-session-cookie.ts";
import { maySignUp } from "./may-sign-up.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";
import { resolveSession } from "./resolve-session.ts";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => FundDb | null;
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
  /** Null when the fund sends no email. */
  emailSender: () => EmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

async function findUserId(tx: FundDb, email: string) {
  const user = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  return user.at(0)?.id ?? null;
}

/** What only the fund has in the shared sign-in: a user is an email address, and only the owner may sign up. */
export const fundAuthConfig = {
  appName: "Paper Fund",
  passkeyRpId,
  postBucket: "auth",
  store: fundAuthStore,
  transaction: <T>(db: FundDb, run: (tx: FundDb) => Promise<T>) =>
    runTransaction(db, run),
  sessionCookie: fundSessionCookie,
  challengeCookie: fundChallengeCookie,
  emailCodeCookie: fundEmailCodeCookie,
  buildCodeEmail: makeCodeEmailBuilder({ en: "Paper Fund", zh: "模拟基金" }),
  isEmailRegistered: async (tx: FundDb, email: string) =>
    (await findUserId(tx, email)) !== null,
  findRecoveryUser: findUserId,
  passkeyName: async (tx: FundDb, userId: string) => {
    const user = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return user.at(0)?.email ?? "Paper Fund";
  },
  createUser: async (
    tx: FundDb,
    { userId, email, now }: { userId: string; email: string; now: Date },
  ) => {
    if (!maySignUp(email)) throw new HttpError(403, "sign_up_closed");
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

export type AuthHandlers = ReturnType<typeof makeFundAuth>;

/** The user of the session cookie. Refuses a request with no live session. */
async function requireUser(request: Request, { db, now }: AuthContext<FundDb>) {
  const token = readRequestCookie(request, fundSessionCookie.name);
  const resolved = token
    ? await resolveSession(db, token, { now, allowRefresh: false })
    : null;
  if (!resolved) throw new HttpError(401, "unauthorized");
  return { userId: resolved.session.userId };
}

/** Gives the user `email`. False when another user has it. */
async function changeEmail(
  tx: FundDb,
  { userId, email }: { userId: string; email: string },
) {
  const taken = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)));
  if (taken.length > 0) return false;
  await tx.update(users).set({ email }).where(eq(users.id, userId));
  return true;
}

/**
 * The passkey routes: sign-in with a saved passkey; sign-up with an emailed
 * code, then a passkey, for the owner only; recovery of a user who lost
 * every passkey, through a code sent to the user's email; and, for the
 * signed-in user, one more passkey and a new email by an emailed code.
 */
export function makeFundAuth(deps: AuthHandlerDeps) {
  const auth = makeAuth({ ...deps, ...fundAuthConfig });
  // `createUser` also refuses. This refusal comes first, so that no code goes to an address that cannot sign up.
  const refuseSignUp = auth.handle(() =>
    Promise.reject(new HttpError(403, "sign_up_closed")),
  );
  return {
    ...auth.handlers,
    requestSignUp: async (request: Request) => {
      const body = authBodies.email.safeParse(
        await request
          .clone()
          .json()
          .catch(() => null),
      );
      return body.success && !maySignUp(body.data.email)
        ? refuseSignUp(request)
        : auth.handlers.requestSignUp(request);
    },
    ...auth.addPasskeyHandlers({ requireUser }),
    ...auth.emailChangeHandlers({ requireUser, changeEmail }),
  };
}
