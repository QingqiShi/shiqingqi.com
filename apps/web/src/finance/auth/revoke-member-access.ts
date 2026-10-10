import { and, eq, isNull } from "drizzle-orm";
import type { RepositoryScope } from "#src/finance/db/repositories/types.ts";
import { invites, passkeys, sessions } from "#src/finance/db/schema.ts";

/**
 * Cancels the Member's pending invites, and ends every session and deletes
 * every passkey of the user it was bound to. Call it in the write that
 * removes the Member.
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
}
