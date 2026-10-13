import { and, eq, isNull } from "drizzle-orm";
import type { RepositoryScope } from "#src/finance/db/repositories/types.ts";
import { invites, passkeys, sessions, users } from "#src/finance/db/schema.ts";

/**
 * Cancels the Member's pending invites, and ends every session, deletes
 * every passkey and clears the Recovery email of the user it was bound to,
 * so that the person can sign up again with that address. Call it in the
 * write that removes the Member.
 */
export async function revokeMemberAccess(
  scope: RepositoryScope,
  { memberId, userId }: { memberId: string; userId: string | null },
) {
  await scope.db
    .delete(invites)
    .where(
      and(
        eq(invites.householdId, scope.householdId),
        eq(invites.memberId, memberId),
        isNull(invites.usedAt),
      ),
    );
  if (userId === null) return;
  await scope.db.delete(sessions).where(eq(sessions.userId, userId));
  await scope.db.delete(passkeys).where(eq(passkeys.userId, userId));
  await scope.db
    .update(users)
    .set({ email: null, emailVerifiedAt: null })
    .where(eq(users.id, userId));
}
