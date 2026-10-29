import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { lookups } from "#src/finance/db/lookups.ts";
import { invites } from "#src/finance/db/schema.ts";
import {
  type FinanceAppDb,
  withHousehold,
} from "#src/finance/db/with-household.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const EMAIL_RECOVERY_LIFETIME_MS = 30 * 60 * 1000;

/**
 * Makes a Recovery link for the Member, not removed, whose user has `email`
 * as a verified Recovery email, and returns its raw token. Null when there is
 * no such Member. With `replaceEmailed`, the new link replaces the earlier
 * emailed links of that Member; a link that the owner made stays.
 */
export async function createEmailRecoveryInvite(
  db: FinanceAppDb,
  {
    email,
    now,
    replaceEmailed,
  }: { email: string; now: Date; replaceEmailed: boolean },
): Promise<string | null> {
  const membership = await lookups.recoveryMember(db, email);
  if (!membership) return null;
  const { householdId, memberId, userId } = membership;
  const token = generateToken();
  await withHousehold(db, householdId, async ({ db: household }) => {
    if (replaceEmailed) {
      await household
        .delete(invites)
        .where(
          and(
            eq(invites.householdId, householdId),
            eq(invites.memberId, memberId),
            eq(invites.createdBy, userId),
            eq(invites.recoveryUserId, userId),
            isNull(invites.usedAt),
          ),
        );
    }
    await household.insert(invites).values({
      id: randomUUID(),
      householdId,
      memberId,
      tokenHash: hashToken(token),
      createdBy: userId,
      expiresAt: new Date(now.getTime() + EMAIL_RECOVERY_LIFETIME_MS),
      recoveryUserId: userId,
    });
  });
  return token;
}
