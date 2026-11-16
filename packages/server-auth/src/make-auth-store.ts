import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { EMAIL_CODE_LIMITS } from "./email-code-limits.ts";
import { generateEmailCode } from "./generate-email-code.ts";
import { generateToken } from "./generate-token.ts";
import { hashEmailCode, isEmailCode } from "./hash-email-code.ts";
import { hashToken } from "./hash-token.ts";
import { HttpError } from "./http-error.ts";
import type { makeAuthTables } from "./make-auth-tables.ts";

const SIGN_UP_LIFETIME_MS = 30 * 60 * 1000;
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_SEEN_PRECISION_MS = 60 * 60 * 1000;

export type AuthTables = ReturnType<typeof makeAuthTables>;

/**
 * An open transaction of the app. The app starts it, so the app chooses the
 * database role that the statements of sign-in run as.
 */
export type AuthTx = Pick<
  PgDatabase<PgQueryResultHKT>,
  "select" | "insert" | "update" | "delete"
>;

export type EmailCodePurpose = "recovery" | "sign-up";

type EmailCodeCheck =
  | { ok: true; email: string }
  /** `ended` when the code is used, expired or out of tries, so that a new one is needed. */
  | { ok: false; ended: boolean };

export interface StoredPasskey {
  id: string;
  userId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
}

export interface NewPasskey {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
}

interface SessionRow {
  sessionId: string;
  userId: string;
}

export type AuthStore = ReturnType<typeof makeAuthStore>;

/** The statements of sign-in on the tables of `makeAuthTables`. Each one runs in a transaction that the app opened. */
export function makeAuthStore({
  emailCodes,
  signUps,
  passkeys,
  sessions,
}: AuthTables) {
  return {
    /** Stores a new six-digit code for `email` and returns it with its id. Expired codes of any address go. */
    async startEmailCode(
      tx: AuthTx,
      {
        purpose,
        email,
        now,
      }: { purpose: EmailCodePurpose; email: string; now: Date },
    ): Promise<{ codeId: string; code: string }> {
      const codeId = randomUUID();
      const code = generateEmailCode();
      await tx.delete(emailCodes).where(lte(emailCodes.expiresAt, now));
      await tx.insert(emailCodes).values({
        id: codeId,
        purpose,
        email,
        codeHash: new Uint8Array(hashEmailCode(codeId, code)),
        createdAt: now,
        expiresAt: new Date(now.getTime() + EMAIL_CODE_LIMITS.lifetimeMs),
      });
      return { codeId, code };
    },

    /**
     * Checks `code` against the code with `codeId`, and uses it up when it
     * matches. Every check counts against the limit before the comparison, so
     * that checks at the same time cannot go past it.
     */
    async checkEmailCode(
      tx: AuthTx,
      {
        purpose,
        codeId,
        code,
        now,
      }: { purpose: EmailCodePurpose; codeId: string; code: string; now: Date },
    ): Promise<EmailCodeCheck> {
      const open = and(
        eq(emailCodes.id, codeId),
        eq(emailCodes.purpose, purpose),
        isNull(emailCodes.usedAt),
        gt(emailCodes.expiresAt, now),
      );
      const counted = (
        await tx
          .update(emailCodes)
          .set({ attempts: sql`${emailCodes.attempts} + 1` })
          .where(
            and(open, lt(emailCodes.attempts, EMAIL_CODE_LIMITS.maxAttempts)),
          )
          .returning({
            email: emailCodes.email,
            codeHash: emailCodes.codeHash,
            attempts: emailCodes.attempts,
          })
      ).at(0);
      if (!counted) return { ok: false, ended: true };
      if (!isEmailCode(codeId, code, counted.codeHash)) {
        return {
          ok: false,
          ended: counted.attempts >= EMAIL_CODE_LIMITS.maxAttempts,
        };
      }
      const used = await tx
        .update(emailCodes)
        .set({ usedAt: now })
        .where(open)
        .returning({ id: emailCodes.id });
      return used.length === 1
        ? { ok: true, email: counted.email }
        : { ok: false, ended: true };
    },

    /**
     * Stores a sign-up link for `email` and returns its raw token. An earlier
     * link for `email` stops working, and expired links of any address go.
     */
    async startSignUp(
      tx: AuthTx,
      { email, now }: { email: string; now: Date },
    ): Promise<string> {
      const token = generateToken();
      await tx
        .delete(signUps)
        .where(
          or(
            and(eq(signUps.email, email), isNull(signUps.usedAt)),
            lte(signUps.expiresAt, now),
          ),
        );
      await tx.insert(signUps).values({
        id: randomUUID(),
        email,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + SIGN_UP_LIFETIME_MS),
      });
      return token;
    },

    /** Null when the token is unknown, used or expired. */
    async lookupSignUp(
      tx: AuthTx,
      token: string,
      now: Date,
    ): Promise<{ signUpId: string; email: string } | null> {
      const signUp = (
        await tx
          .select({ signUpId: signUps.id, email: signUps.email })
          .from(signUps)
          .where(
            and(
              eq(signUps.tokenHash, hashToken(token)),
              isNull(signUps.usedAt),
              gt(signUps.expiresAt, now),
            ),
          )
          .limit(1)
      ).at(0);
      return signUp ?? null;
    },

    /** Uses the sign-up link up. False when it is used or expired already. */
    async consumeSignUp(
      tx: AuthTx,
      { signUpId, now }: { signUpId: string; now: Date },
    ): Promise<boolean> {
      const used = await tx
        .update(signUps)
        .set({ usedAt: now })
        .where(
          and(
            eq(signUps.id, signUpId),
            isNull(signUps.usedAt),
            gt(signUps.expiresAt, now),
          ),
        )
        .returning({ id: signUps.id });
      return used.length === 1;
    },

    async findPasskey(tx: AuthTx, id: string): Promise<StoredPasskey | null> {
      const passkey = (
        await tx
          .select({
            id: passkeys.id,
            userId: passkeys.userId,
            publicKey: passkeys.publicKey,
            counter: passkeys.counter,
            transports: passkeys.transports,
          })
          .from(passkeys)
          .where(eq(passkeys.id, id))
          .limit(1)
      ).at(0);
      return passkey ?? null;
    },

    /** The passkeys of a user, oldest first. */
    async listPasskeys(
      tx: AuthTx,
      userId: string,
    ): Promise<{ id: string; transports: string[] }[]> {
      return tx
        .select({ id: passkeys.id, transports: passkeys.transports })
        .from(passkeys)
        .where(eq(passkeys.userId, userId))
        .orderBy(asc(passkeys.createdAt));
    },

    async insertPasskey(
      tx: AuthTx,
      userId: string,
      credential: NewPasskey,
      now: Date,
    ): Promise<void> {
      const inserted = await tx
        .insert(passkeys)
        .values({
          id: credential.id,
          userId,
          publicKey: credential.publicKey,
          counter: credential.counter,
          transports: credential.transports ?? [],
          createdAt: now,
        })
        .onConflictDoNothing()
        .returning({ id: passkeys.id });
      if (inserted.length === 0) throw new HttpError(409, "passkey_exists");
    },

    async markPasskeyUsed(
      tx: AuthTx,
      id: string,
      { counter, now }: { counter: number; now: Date },
    ): Promise<void> {
      await tx
        .update(passkeys)
        .set({ counter, lastUsedAt: now })
        .where(eq(passkeys.id, id));
    },

    /** Returns the raw token. Only its hash is stored. Also deletes the user's expired sessions. */
    async createSession(
      tx: AuthTx,
      {
        userId,
        userAgent,
        now,
        maxAgeSeconds,
      }: {
        userId: string;
        userAgent: string;
        now: Date;
        maxAgeSeconds: number;
      },
    ): Promise<string> {
      const token = generateToken();
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), lte(sessions.expiresAt, now)));
      await tx.insert(sessions).values({
        id: randomUUID(),
        userId,
        tokenHash: hashToken(token),
        createdAt: now,
        refreshedAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000),
        userAgent: userAgent.slice(0, 512),
      });
      return token;
    },

    /**
     * Ends every passkey and session of a user. Recovery calls it: a lost
     * device must not keep access.
     */
    async revokeUserAccess(tx: AuthTx, userId: string): Promise<void> {
      await tx.delete(passkeys).where(eq(passkeys.userId, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    },

    async deleteSession(tx: AuthTx, token: string): Promise<void> {
      await tx.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    },

    /**
     * The live session of a token as `sessionOf` reads it, or null. An
     * expired session goes. A session that is a week old gets its full life
     * again where `mayRefresh` allows, and the caller must then send the
     * cookie again.
     */
    async resolveSession<Session>(
      tx: AuthTx,
      token: string,
      {
        now,
        maxAgeSeconds,
        sessionOf,
        mayRefresh,
      }: {
        now: Date;
        maxAgeSeconds: number;
        sessionOf: (row: SessionRow) => Promise<Session | null>;
        mayRefresh: (session: Session) => boolean;
      },
    ): Promise<{ session: Session; refreshed: boolean } | null> {
      const row = (
        await tx
          .select({
            sessionId: sessions.id,
            userId: sessions.userId,
            refreshedAt: sessions.refreshedAt,
            lastSeenAt: sessions.lastSeenAt,
            expiresAt: sessions.expiresAt,
          })
          .from(sessions)
          .where(eq(sessions.tokenHash, hashToken(token)))
          .limit(1)
      ).at(0);
      if (!row) return null;

      if (row.expiresAt.getTime() <= now.getTime()) {
        await tx.delete(sessions).where(eq(sessions.id, row.sessionId));
        return null;
      }
      const session = await sessionOf({
        sessionId: row.sessionId,
        userId: row.userId,
      });
      if (session === null) return null;

      const refreshed =
        mayRefresh(session) &&
        now.getTime() - row.refreshedAt.getTime() >= REFRESH_AFTER_MS;
      if (refreshed) {
        await tx
          .update(sessions)
          .set({
            refreshedAt: now,
            lastSeenAt: now,
            expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000),
          })
          .where(eq(sessions.id, row.sessionId));
      } else if (
        now.getTime() - row.lastSeenAt.getTime() >=
        LAST_SEEN_PRECISION_MS
      ) {
        await tx
          .update(sessions)
          .set({ lastSeenAt: now })
          .where(eq(sessions.id, row.sessionId));
      }
      return { session, refreshed };
    },
  };
}
