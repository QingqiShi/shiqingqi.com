import { randomUUID } from "node:crypto";
import { EMAIL_CODE_LIMITS } from "@tuja/server-auth/email-code-limits";
import { generateEmailCode } from "@tuja/server-auth/generate-email-code";
import { hashEmailCode, isEmailCode } from "@tuja/server-auth/hash-email-code";
import { and, eq, gt, isNull, lt, lte, sql } from "drizzle-orm";
import { emailCodes } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";

type EmailCodePurpose = (typeof emailCodes.$inferInsert)["purpose"];

type EmailCodeCheck =
  | { ok: true; email: string }
  /** `ended` when the code is used, expired or out of tries, so that a new one is needed. */
  | { ok: false; ended: boolean };

/** Stores a new six-digit code for `email` and returns it with its id. Expired codes of any address go. */
export async function startEmailCode(
  db: FinanceAppDb,
  {
    purpose,
    email,
    now,
  }: { purpose: EmailCodePurpose; email: string; now: Date },
): Promise<{ codeId: string; code: string }> {
  const codeId = randomUUID();
  const code = generateEmailCode();
  await db.delete(emailCodes).where(lte(emailCodes.expiresAt, now));
  await db.insert(emailCodes).values({
    id: codeId,
    purpose,
    email,
    codeHash: new Uint8Array(hashEmailCode(codeId, code)),
    createdAt: now,
    expiresAt: new Date(now.getTime() + EMAIL_CODE_LIMITS.lifetimeMs),
  });
  return { codeId, code };
}

/**
 * Checks `code` against the code with `codeId`, and uses it up when it
 * matches. Every check counts against the limit before the comparison, so
 * that checks at the same time cannot go past it.
 */
export async function checkEmailCode(
  db: FinanceAppDb,
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
    await db
      .update(emailCodes)
      .set({ attempts: sql`${emailCodes.attempts} + 1` })
      .where(and(open, lt(emailCodes.attempts, EMAIL_CODE_LIMITS.maxAttempts)))
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
  const used = await db
    .update(emailCodes)
    .set({ usedAt: now })
    .where(open)
    .returning({ id: emailCodes.id });
  return used.length === 1
    ? { ok: true, email: counted.email }
    : { ok: false, ended: true };
}
