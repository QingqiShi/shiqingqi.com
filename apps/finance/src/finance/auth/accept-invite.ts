import { hashToken } from "@tuja/server-auth/hash-token";
import { HttpError } from "@tuja/server-auth/http-error";
import { and, eq, gt, isNull } from "drizzle-orm";
import { lookups } from "#src/finance/db/lookups.ts";
import { invites, users } from "#src/finance/db/schema.ts";
import {
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";

/**
 * Uses the open invite of `token` to make the user the invited Member, and
 * gives the user the Member's name. Refuses a user who is a Member already.
 */
export async function acceptInvite(
  tx: FinanceAppDb,
  { token, userId, now }: { token: string; userId: string; now: Date },
) {
  // The lock makes a second request of the same user wait, and then refuse.
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if ((await lookups.membershipsOfUser(tx, userId)).length > 0) {
    throw new HttpError(409, "already_member");
  }
  const invite = await lookups.inviteByToken(tx, hashToken(token), now);
  if (invite === null) throw new HttpError(410, "invite_invalid");
  const { householdId, memberId, inviteId } = invite;
  await withHousehold(tx, householdId, async (scope) => {
    const used = await scope.db
      .update(invites)
      .set({ usedAt: now })
      .where(
        and(
          eq(invites.householdId, householdId),
          eq(invites.id, inviteId),
          isNull(invites.usedAt),
          gt(invites.expiresAt, now),
        ),
      )
      .returning({ id: invites.id });
    if (used.length === 0) throw new HttpError(410, "invite_invalid");
    if (!(await bindUserToMember(scope, { memberId, userId }))) {
      throw new HttpError(409, "member_claimed");
    }
  });
  await tx
    .update(users)
    .set({ displayName: invite.memberName })
    .where(eq(users.id, userId));
  return { householdId, memberId };
}
