import {
  makeAuth,
  type AuthRateLimitBucket,
} from "@tuja/server-auth/make-auth";
import type { AuthRateLimitResult } from "@tuja/server-auth/make-auth-route-kit";
import { runTransaction } from "@tuja/server-db/run-transaction";
import { makeCodeEmailBuilder } from "@tuja/server-email/make-code-email-builder";
import type { EmailSender } from "@tuja/server-email/types";
import { eq } from "drizzle-orm";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { buddyAuthStore } from "./buddy-auth-store.ts";
import { buddyChallengeCookie } from "./buddy-challenge-cookie.ts";
import { buddyEmailCodeCookie } from "./buddy-email-code-cookie.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { createAccount } from "./create-account.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";

export interface AuthHandlerDeps {
  /** Null when the app has no database. */
  getDb: () => BuddyDb | null;
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
  /** Null when Buddy sends no email. */
  emailSender: () => EmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

/** What only Buddy has in the shared sign-in: a new account gets a random name. */
export const buddyAuthConfig = {
  appName: "Buddy",
  passkeyRpId,
  postBucket: "auth",
  store: buddyAuthStore,
  transaction: <T>(db: BuddyDb, run: (tx: BuddyDb) => Promise<T>) =>
    runTransaction(db, run),
  sessionCookie: buddySessionCookie,
  challengeCookie: buddyChallengeCookie,
  emailCodeCookie: buddyEmailCodeCookie,
  buildCodeEmail: makeCodeEmailBuilder({ en: "Buddy", zh: "搭子" }),
  isEmailRegistered: async (tx: BuddyDb, email: string) =>
    (await tx.$count(accounts, eq(accounts.email, email))) > 0,
  findRecoveryUser: async (tx: BuddyDb, email: string) => {
    const account = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, email));
    return account[0]?.id ?? null;
  },
  passkeyName: async (tx: BuddyDb, userId: string) => {
    const account = await tx
      .select({ email: accounts.email })
      .from(accounts)
      .where(eq(accounts.id, userId));
    return account[0]?.email ?? "Buddy";
  },
  createUser: createAccount,
  signIn: () => Promise.resolve({}),
} as const;

export function makeBuddyAuth(deps: AuthHandlerDeps) {
  return makeAuth({ ...deps, ...buddyAuthConfig });
}
