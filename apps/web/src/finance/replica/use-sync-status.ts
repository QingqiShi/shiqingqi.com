import { useSyncExternalStore } from "react";
import type { SyncStatus } from "./types.ts";
import { useFinanceRuntime } from "./use-finance-runtime.ts";

/** Online or offline, unpushed mutations, the last sync, and any problem. */
export function useSyncStatus(): SyncStatus {
  const { loop } = useFinanceRuntime().runtime;
  return useSyncExternalStore(
    loop.subscribeStatus,
    loop.getStatus,
    loop.getStatus,
  );
}
