import { and, eq, isNull, sql } from "drizzle-orm";
import { households, members } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";

/**
 * Binds a user to a member that has no user yet, and gives the member row a
 * new household clock so that sync sends it. Returns false when the member
 * has a user already. Call it inside a transaction.
 */
export async function bindUserToMember(
  tx: FinanceDb,
  {
    householdId,
    memberId,
    userId,
  }: { householdId: string; memberId: string; userId: string },
): Promise<boolean> {
  const household = (
    await tx
      .update(households)
      .set({ clock: sql`${households.clock} + 1` })
      .where(eq(households.id, householdId))
      .returning({ clock: households.clock })
  ).at(0);
  if (!household) return false;

  const bound = await tx
    .update(members)
    .set({ userId, version: household.clock, updatedAt: sql`now()` })
    .where(
      and(
        eq(members.id, memberId),
        eq(members.householdId, householdId),
        isNull(members.userId),
        isNull(members.deletedAt),
      ),
    )
    .returning({ id: members.id });
  return bound.length === 1;
}
