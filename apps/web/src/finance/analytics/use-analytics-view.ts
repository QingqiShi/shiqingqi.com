import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import type { AnalyticsState } from "./compute-analytics-view.ts";
import { selectAnalyticsIndex } from "./select-analytics-index.ts";
import { selectAnalyticsView } from "./select-analytics-view.ts";

/** Everything the Analytics screen shows for `state`, worked out from the Replica. */
export function useAnalyticsView(state: AnalyticsState) {
  const store = useReplicaStore();
  const transactionsFrom = useReplica(() => store.getMeta().transactionsFrom);
  const index = useReplica((snapshot) =>
    selectAnalyticsIndex(snapshot, transactionsFrom),
  );
  const today = useHouseholdToday();
  return { view: selectAnalyticsView(index, state, today), index, today };
}
