import {
  createHash,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { and, eq, gt, isNull, lt, lte, sql } from "drizzle-orm";
import { emailCodes } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";

export const EMAIL_CODE_LIFETIME_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type EmailCodePurpose = (typeof emailCodes.$inferInsert)["purpose"];

type EmailCodeCheck =
  | { ok: true; email: string }
  /** `ended` when the code is used, expired or out of tries, so that a new one is needed. */
  | { ok: false; ended: boolean };

function hashCode(codeId: string, code: string): Buffer {
  return createHash("sha256").update(`${codeId}:${code}`).digest();
}

/** The six digits of a typed code, with spaces and dashes taken out, or null. */
export function normaliseEmailCode(value: string): string | null {
  const code = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

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
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.delete(emailCodes).where(lte(emailCodes.expiresAt, now));
  await db.insert(emailCodes).values({
    id: codeId,
    purpose,
    email,
    codeHash: new Uint8Array(hashCode(codeId, code)),
    createdAt: now,
    expiresAt: new Date(now.getTime() + EMAIL_CODE_LIFETIME_MS),
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
      .where(and(open, lt(emailCodes.attempts, MAX_ATTEMPTS)))
      .returning({
        email: emailCodes.email,
        codeHash: emailCodes.codeHash,
        attempts: emailCodes.attempts,
      })
  ).at(0);
  if (!counted) return { ok: false, ended: true };
  const expected = Buffer.from(counted.codeHash);
  if (!timingSafeEqual(hashCode(codeId, code), expected)) {
    return { ok: false, ended: counted.attempts >= MAX_ATTEMPTS };
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
