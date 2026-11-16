import { HttpError } from "@tuja/server-auth/http-error";
import { makeAuth } from "@tuja/server-auth/make-auth";
import { eq } from "drizzle-orm";
import { findPostgresError } from "#src/finance/db/find-postgres-error.ts";
import { lookups } from "#src/finance/db/lookups.ts";
import { users, VERIFIED_EMAIL_KEY } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import {
  asFinanceApp,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { resolveClientIp } from "#src/http/resolve-client-ip.ts";
import { buildCodeEmail } from "../email/build-code-email.ts";
import type { FinanceEmailSender } from "../email/types.ts";
import type {
  LimitFinanceRequest,
  RefundFinanceRequest,
} from "../http/types.ts";
import { createSignUpUser, signUpFields } from "./create-sign-up-user.ts";
import { financeAuthStore } from "./finance-auth-store.ts";
import { financeChallengeCookie } from "./finance-challenge-cookie.ts";
import { financeEmailCodeCookie } from "./finance-email-code-cookie.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { isEmailRegistered } from "./is-email-registered.ts";
import { passkeyRpId } from "./passkey-rp-id.ts";

export interface AuthHandlerDeps {
  /** Null when finance has no database. */
  getDb: () => FinanceDb | null;
  now: () => Date;
  authSecret: () => string | undefined;
  limitRequest: LimitFinanceRequest;
  refundRequest: RefundFinanceRequest;
  isAllowedOrigin: (origin: string) => boolean;
  /** Null when Finance sends no email. */
  emailSender: () => FinanceEmailSender | null;
  /** Runs `task` after the response is sent, so that its time does not show in the response. */
  afterResponse: (task: () => Promise<void>) => void;
}

export type FinanceAuth = ReturnType<typeof makeFinanceAuth>;

/**
 * What only Finance has in the shared sign-in: a new user gets a Household,
 * and a user signs in only while a Member of one.
 */
export const financeAuthConfig = {
  appName: "Finance",
  passkeyRpId,
  clientIp: (request: Request) => resolveClientIp(request.headers),
  postBucket: "auth",
  // A second user with the same verified Recovery email.
  toHttpError: (error: unknown) => {
    const postgres = findPostgresError(error);
    return postgres?.code === "23505" &&
      postgres.constraint === VERIFIED_EMAIL_KEY
      ? new HttpError(409, "email_registered")
      : undefined;
  },
  store: financeAuthStore,
  transaction: asFinanceApp,
  sessionCookie: financeSessionCookie,
  challengeCookie: financeChallengeCookie,
  emailCodeCookie: financeEmailCodeCookie,
  buildCodeEmail,
  isEmailRegistered,
  findRecoveryUser: async (tx: FinanceAppDb, email: string) =>
    (await lookups.recoveryMember(tx, email))?.userId ?? null,
  passkeyName: async (tx: FinanceAppDb, userId: string) => {
    const user = (
      await tx
        .select({ email: users.email, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
    ).at(0);
    return user?.email ?? user?.displayName ?? "Finance";
  },
  signUpFields,
  createUser: createSignUpUser,
  signIn: async (tx: FinanceAppDb, userId: string) => {
    const memberships = await lookups.membershipsOfUser(tx, userId);
    if (memberships.length === 0) throw new HttpError(403, "no_membership");
    return { ok: true };
  },
} as const;

export function makeFinanceAuth(deps: AuthHandlerDeps) {
  return makeAuth({ ...deps, ...financeAuthConfig });
}
