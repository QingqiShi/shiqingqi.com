import { randomUUID } from "node:crypto";
import { generateToken } from "@tuja/server-auth/generate-token";
import { hashToken } from "@tuja/server-auth/hash-token";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { accounts, recoveries } from "#src/server/db/schema.ts";
import type { BuddyDb } from "#src/server/db/types.ts";

const RECOVERY_LIFETIME_MS = 30 * 60 * 1000;

/**
 * Makes a recovery link for the account that has `email`, and returns its
 * raw token. Null when no account has it. With `replaceEmailed`, the new
 * link ends the account's earlier links. Expired links of every account go.
 */
export async function createEmailRecovery(
  db: BuddyDb,
  {
    email,
    now,
    replaceEmailed,
  }: { email: string; now: Date; replaceEmailed: boolean },
): Promise<string | null> {
  const account = (
    await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.email, email))
      .limit(1)
  ).at(0);
  if (!account) return null;
  await db
    .delete(recoveries)
    .where(
      replaceEmailed
        ? or(
            and(eq(recoveries.userId, account.id), isNull(recoveries.usedAt)),
            lte(recoveries.expiresAt, now),
          )
        : lte(recoveries.expiresAt, now),
    );
  const token = generateToken();
  await db.insert(recoveries).values({
    id: randomUUID(),
    userId: account.id,
    tokenHash: hashToken(token),
    createdAt: now,
    expiresAt: new Date(now.getTime() + RECOVERY_LIFETIME_MS),
  });
  return token;
}

/** The open recovery link of a token at `now`, with its account, or null. */
export async function lookupRecovery(db: BuddyDb, token: string, now: Date) {
  const rows = await db
    .select({
      recoveryId: recoveries.id,
      userId: recoveries.userId,
      name: accounts.name,
      email: accounts.email,
    })
    .from(recoveries)
    .innerJoin(accounts, eq(accounts.id, recoveries.userId))
    .where(
      and(
        eq(recoveries.tokenHash, hashToken(token)),
        isNull(recoveries.usedAt),
        gt(recoveries.expiresAt, now),
      ),
    )
    .limit(1);
  return rows.at(0) ?? null;
}

/** Marks the link used. False when it was used or expired in the meantime. */
export async function consumeRecovery(
  db: BuddyDb,
  { recoveryId, now }: { recoveryId: string; now: Date },
): Promise<boolean> {
  const used = await db
    .update(recoveries)
    .set({ usedAt: now })
    .where(
      and(
        eq(recoveries.id, recoveryId),
        isNull(recoveries.usedAt),
        gt(recoveries.expiresAt, now),
      ),
    )
    .returning({ id: recoveries.id });
  return used.length === 1;
}
