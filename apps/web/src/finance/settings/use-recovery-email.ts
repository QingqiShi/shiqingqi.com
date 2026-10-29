import { useEffect, useSyncExternalStore } from "react";
import {
  financePasskeyClient,
  type RecoveryEmail,
} from "../auth/finance-passkey-client.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";

let current: RecoveryEmail | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(value: RecoveryEmail) {
  current = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function load() {
  loading ??= financePasskeyClient
    .getRecoveryEmail()
    .then(publish)
    .catch(() => {
      // Offline: the Settings menu and the Members section show no email state.
    })
    .finally(() => {
      loading = null;
    });
}

/** Writes what the server answered, so every screen that reads the Recovery email shows it. */
export const publishRecoveryEmail = publish;

/** The signed-in user's Recovery email, read from the server on mount. Null until it loads, offline, or in the demo. */
export function useRecoveryEmail(): RecoveryEmail | null {
  const { readOnly } = useFinanceRuntime();
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!readOnly) load();
  }, [readOnly]);
  return value;
}
