import { and, eq, gt, isNull, or } from "drizzle-orm";
import { households, invites, members } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { hashToken } from "./hash-token.ts";

interface OpenInvite {
  inviteId: string;
  householdId: string;
  householdName: string;
  memberId: string;
  memberName: string;
  expiresAt: Date;
  /** The user of the Member when the invite lets them back in; null when it binds a new user. */
  recoveryUserId: string | null;
}

/**
 * Null when the token is unknown, used or expired, or when its Member's user
 * is not the one the invite was made for: a new-member invite needs a Member
 * without a user, a recovery invite needs the same user as when it was made.
 */
export async function lookupInvite(
  db: FinanceDb,
  token: string,
  now: Date,
): Promise<OpenInvite | null> {
  const invite = (
    await db
      .select({
        inviteId: invites.id,
        householdId: invites.householdId,
        householdName: households.name,
        memberId: members.id,
        memberName: members.name,
        expiresAt: invites.expiresAt,
        recoveryUserId: invites.recoveryUserId,
      })
      .from(invites)
      .innerJoin(members, eq(members.id, invites.memberId))
      .innerJoin(households, eq(households.id, invites.householdId))
      .where(
        and(
          eq(invites.tokenHash, hashToken(token)),
          isNull(invites.usedAt),
          gt(invites.expiresAt, now),
          isNull(members.deletedAt),
          or(
            and(isNull(invites.recoveryUserId), isNull(members.userId)),
            eq(invites.recoveryUserId, members.userId),
          ),
        ),
      )
      .limit(1)
  ).at(0);
  return invite ?? null;
}
