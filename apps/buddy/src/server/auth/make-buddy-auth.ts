import {
  makeAuth,
  type AuthRateLimitBucket,
} from "@tuja/server-auth/make-auth";
import type { AuthRateLimitResult } from "@tuja/server-auth/make-auth-route-kit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import type { BuddyEmailSender } from "../email/types.ts";
import { buddyAuthStore } from "./buddy-auth-store.ts";
import { buddyChallengeCookie } from "./buddy-challenge-cookie.ts";
import { buddyEmailCodeCookie } from "./buddy-email-code-cookie.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { createAccount } from "./create-account.ts";
import { createEmailRecovery } from "./create-email-recovery.ts";
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
  emailSender: () => BuddyEmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

export type BuddyAuth = ReturnType<typeof makeBuddyAuth>;

/**
 * The shared sign-in with what only Buddy has: a new account gets a random
 * name, and sign-in answers with that name, so that the page can go to the
 * account's pet.
 */
export function makeBuddyAuth(deps: AuthHandlerDeps) {
  return makeAuth({
    ...deps,
    appName: "Buddy",
    passkeyRpId,
    postBucket: "auth",
    store: buddyAuthStore,
    transaction: <T>(db: BuddyDb, run: (tx: BuddyDb) => Promise<T>) =>
      db.transaction(run),
    sessionCookie: buddySessionCookie,
    challengeCookie: buddyChallengeCookie,
    emailCodeCookie: buddyEmailCodeCookie,
    buildCodeEmail,
    isEmailRegistered: async (tx, email) =>
      (await tx.$count(accounts, eq(accounts.email, email))) > 0,
    startRecovery: async (tx, input) => {
      const token = await createEmailRecovery(tx, input);
      return token === null ? null : `/recover/${token}`;
    },
    signUpFields: z.object({}),
    createUser: createAccount,
    signIn: async (tx, userId) => {
      const account = await tx
        .select({ name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, userId));
      return { name: account[0]?.name };
    },
  });
}
