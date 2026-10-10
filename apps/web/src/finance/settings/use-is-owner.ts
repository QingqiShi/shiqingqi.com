import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";

/** True when the signed-in Member is the Household's owner. */
export function useIsOwner(): boolean {
  const { memberId } = useFinanceRuntime();
  return useReplica(
    (snapshot) => snapshot.tables.members.get(memberId)?.role === "owner",
  );
}
