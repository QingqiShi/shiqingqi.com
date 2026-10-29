import { and, eq, isNull, sql } from "drizzle-orm";
import type { RepositoryScope } from "#src/finance/db/repositories/types.ts";
import { households, members } from "#src/finance/db/schema.ts";

/**
 * Binds a user to a member that has no user yet, and gives the member row a
 * new household clock so that sync sends it. Returns false when the member
 * has a user already.
 */
export async function bindUserToMember(
  { db, householdId }: RepositoryScope,
  { memberId, userId }: { memberId: string; userId: string },
): Promise<boolean> {
  const household = (
    await db
      .update(households)
      .set({ clock: sql`${households.clock} + 1` })
      .where(eq(households.id, householdId))
      .returning({ clock: households.clock })
  ).at(0);
  if (!household) return false;

  const bound = await db
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
