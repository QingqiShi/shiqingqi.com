import { lookups } from "#src/finance/db/lookups.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";

type SetupState =
  | { mode: "create" }
  | {
      mode: "claim";
      householdId: string;
      householdName: string;
      memberId: string;
      memberName: string;
    }
  | { mode: "closed" };

/**
 * What sign-in setup may do now: create the first household, let the visitor
 * claim an owner member that has no user yet, or nothing.
 */
export async function getSetupState(db: FinanceAppDb): Promise<SetupState> {
  const owners = await lookups.ownerMembers(db);
  if (owners.length === 0 && (await lookups.householdIds(db)).length === 0) {
    return { mode: "create" };
  }

  const unclaimedOwner = owners.find((owner) => owner.userId === null);
  if (!unclaimedOwner) return { mode: "closed" };
  const { householdId, householdName, memberId, memberName } = unclaimedOwner;
  return { mode: "claim", householdId, householdName, memberId, memberName };
}
