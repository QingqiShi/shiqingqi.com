import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { lookups } from "#src/finance/db/lookups.ts";
import { invites } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { asFinanceApp, withHousehold } from "#src/finance/db/with-household.ts";
import { generateToken } from "./generate-token.ts";
import { hashToken } from "./hash-token.ts";

const EMAIL_RECOVERY_LIFETIME_MS = 30 * 60 * 1000;

interface EmailRecoveryInvite {
  householdName: string;
  token: string;
}

/**
 * Makes a Recovery link for each Member, not removed, whose user has `email`
 * as a verified Recovery email. With `replaceEmailed`, the new links replace
 * the earlier emailed links of that Member; a link that the owner made
 * stays.
 */
export function createEmailRecoveryInvites(
  db: FinanceDb,
  {
    email,
    now,
    replaceEmailed,
  }: { email: string; now: Date; replaceEmailed: boolean },
): Promise<EmailRecoveryInvite[]> {
  const expiresAt = new Date(now.getTime() + EMAIL_RECOVERY_LIFETIME_MS);
  return asFinanceApp(db, async (tx) => {
    const memberships = await lookups.recoveryMembers(tx, email);
    const created: EmailRecoveryInvite[] = [];
    for (const {
      householdId,
      householdName,
      memberId,
      userId,
    } of memberships) {
      const token = generateToken();
      await withHousehold(tx, householdId, async ({ db: household }) => {
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
          expiresAt,
          recoveryUserId: userId,
        });
      });
      created.push({ householdName, token });
    }
    return created;
  });
}
