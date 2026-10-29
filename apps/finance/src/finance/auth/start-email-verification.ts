import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, ne, or } from "drizzle-orm";
import { emailVerifications, users } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const VERIFICATION_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Sets the user's Recovery email and returns the raw token of a new
 * verification link for it. A new address is not verified until its link is
 * opened. An earlier link of the user stops working. The link remembers the
 * confirmed Recovery email it replaces, also across several changes that
 * were not confirmed.
 */
export async function startEmailVerification(
  db: FinanceAppDb,
  { userId, email, now }: { userId: string; email: string; now: Date },
): Promise<string> {
  const token = generateToken();
  const user = (
    await db
      .select({ email: users.email, verifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  ).at(0);
  await db
    .update(users)
    .set({ email, emailVerifiedAt: null })
    .where(
      and(
        eq(users.id, userId),
        or(isNull(users.email), ne(users.email, email)),
      ),
    );
  const earlier = await db
    .delete(emailVerifications)
    .where(
      and(
        eq(emailVerifications.userId, userId),
        isNull(emailVerifications.usedAt),
      ),
    )
    .returning({ replacesEmail: emailVerifications.replacesEmail });
  const confirmed =
    user?.verifiedAt != null
      ? user.email
      : (earlier.find((link) => link.replacesEmail !== null)?.replacesEmail ??
        null);
  await db.insert(emailVerifications).values({
    id: randomUUID(),
    userId,
    email,
    replacesEmail: confirmed === email ? null : confirmed,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
  });
  return token;
}

interface VerifiedRecoveryEmail {
  userId: string;
  email: string;
  /** The confirmed Recovery email that the user had before, when it is a different address. */
  replacedEmail: string | null;
}

/** Marks the link used and the user's Recovery email verified. Null when the link is unknown, used or expired, or the user's email changed after it was sent. */
export async function verifyRecoveryEmail(
  db: FinanceAppDb,
  token: string,
  now: Date,
): Promise<VerifiedRecoveryEmail | null> {
  const used = (
    await db
      .update(emailVerifications)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerifications.tokenHash, hashToken(token)),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, now),
        ),
      )
      .returning({
        userId: emailVerifications.userId,
        email: emailVerifications.email,
        replacesEmail: emailVerifications.replacesEmail,
      })
  ).at(0);
  if (!used) return null;
  const verified = await db
    .update(users)
    .set({ emailVerifiedAt: now })
    .where(and(eq(users.id, used.userId), eq(users.email, used.email)))
    .returning({ id: users.id });
  if (verified.length !== 1) return null;
  return {
    userId: used.userId,
    email: used.email,
    replacedEmail:
      used.replacesEmail === used.email ? null : used.replacesEmail,
  };
}
