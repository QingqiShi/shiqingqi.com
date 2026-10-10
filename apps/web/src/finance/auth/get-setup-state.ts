import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { households, members } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";

type SetupState =
  | { mode: "create" }
  | {
      mode: "claim";
      householdId: string;
      householdName: string;
      memberId: string;
      memberName: string;
    }
  | {
      mode: "recover";
      householdId: string;
      householdName: string;
      memberId: string;
      memberName: string;
      userId: string;
    }
  | { mode: "closed" };

/**
 * What sign-in setup may do now: create the first household, let the visitor
 * claim an owner member that has no user yet, give the owner's user a new
 * passkey when every owner member is claimed, or nothing.
 */
export async function getSetupState(db: FinanceDb): Promise<SetupState> {
  const household = (
    await db.select({ id: households.id }).from(households).limit(1)
  ).at(0);
  if (!household) return { mode: "create" };

  const unclaimedOwner = (
    await db
      .select({
        householdId: households.id,
        householdName: households.name,
        memberId: members.id,
        memberName: members.name,
      })
      .from(members)
      .innerJoin(households, eq(households.id, members.householdId))
      .where(
        and(
          eq(members.role, "owner"),
          isNull(members.userId),
          isNull(members.deletedAt),
        ),
      )
      .orderBy(asc(households.createdAt), asc(members.createdAt))
      .limit(1)
  ).at(0);
  if (unclaimedOwner) return { mode: "claim", ...unclaimedOwner };

  const claimedOwner = (
    await db
      .select({
        householdId: households.id,
        householdName: households.name,
        memberId: members.id,
        memberName: members.name,
        userId: members.userId,
      })
      .from(members)
      .innerJoin(households, eq(households.id, members.householdId))
      .where(
        and(
          eq(members.role, "owner"),
          isNotNull(members.userId),
          isNull(members.deletedAt),
        ),
      )
      .orderBy(asc(households.createdAt), asc(members.createdAt))
      .limit(1)
  ).at(0);
  if (!claimedOwner?.userId) return { mode: "closed" };
  return { mode: "recover", ...claimedOwner, userId: claimedOwner.userId };
}
