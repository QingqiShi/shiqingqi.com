import { useSyncExternalStore } from "react";
import type { ReplicaSnapshot } from "./types.ts";
import { useFinanceRuntime } from "./use-finance-runtime.ts";

/**
 * Reads from the Replica and re-renders when the result changes. The
 * selector must return the same value for the same snapshot: use the
 * memoised selectors in `finance/store/`, or return a primitive.
 */
export function useReplica<T>(selector: (snapshot: ReplicaSnapshot) => T): T {
  const { store } = useFinanceRuntime().runtime;
  const read = () => selector(store.getSnapshot());
  return useSyncExternalStore(store.subscribe, read, read);
}
