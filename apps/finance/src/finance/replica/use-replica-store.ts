import { useFinanceRuntime } from "./use-finance-runtime.ts";

/** The Replica store, for `applyLocal` and the listeners. Reading data goes through `useReplica`. */
export function useReplicaStore() {
  return useFinanceRuntime().runtime.store;
}
