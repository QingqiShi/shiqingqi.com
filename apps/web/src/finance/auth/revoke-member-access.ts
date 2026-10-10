import { and, eq, isNull } from "drizzle-orm";
import { invites, passkeys, sessions } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";

/**
 * Cancels the Member's pending invites, and ends every session and deletes
 * every passkey of the user it was bound to. Call it in the write that
 * removes the Member.
 */
export async function revokeMemberAccess(
  db: FinanceDb,
  { memberId, userId }: { memberId: string; userId: string | null },
) {
  await db
    .delete(invites)
    .where(and(eq(invites.memberId, memberId), isNull(invites.usedAt)));
  if (userId === null) return;
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await db.delete(passkeys).where(eq(passkeys.userId, userId));
}
