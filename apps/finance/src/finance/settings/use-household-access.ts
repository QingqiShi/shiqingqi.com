import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";

/**
 * What the signed-in Member may change: the owner changes the Household's
 * settings, a member does not, and a viewer of the demo changes nothing.
 */
export function useHouseholdAccess(): "owner" | "member" | "viewer" {
  const { memberId, readOnly } = useFinanceRuntime();
  const owner = useReplica(
    (snapshot) => snapshot.tables.members.get(memberId)?.role === "owner",
  );
  if (readOnly) return "viewer";
  return owner ? "owner" : "member";
}
