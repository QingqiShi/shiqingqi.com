"use client";

import { useEffect } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import {
  FINANCE_PRECACHE_MESSAGE,
  type FinancePrecacheMessage,
} from "#src/pwa/runtime-caching/is-finance-precache-message.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";
import { SETTINGS_SECTIONS } from "../settings/settings-sections.ts";
import { FINANCE_DESTINATION_PATHS } from "./finance-destination-paths.ts";

let requested = false;

/** The locale-free page of every Finance screen that opens from the Replica alone. */
function financeShellPaths(): string[] {
  return [
    ...FINANCE_DESTINATION_PATHS,
    ...SETTINGS_SECTIONS.map((section) => `/finance/settings/${section}`),
  ];
}

/**
 * Once this device holds the Household's data and has synced, asks the
 * service worker to store every Finance screen, so a screen the visitor
 * never opened still opens offline. Once per page load; the service worker
 * skips pages it stored recently.
 */
export function PrecacheFinanceShells() {
  const locale = useLocale();
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const status = useSyncStatus();
  const ready =
    bootstrapped && status.problem === null && status.lastSyncedAt !== null;

  useEffect(() => {
    if (!ready || requested || !("serviceWorker" in navigator)) return;
    requested = true;
    const message: FinancePrecacheMessage = {
      type: FINANCE_PRECACHE_MESSAGE,
      paths: financeShellPaths().map((path) => getLocalePath(path, locale)),
    };
    void navigator.serviceWorker.ready.then((registration) => {
      registration.active?.postMessage(message);
    });
  }, [ready, locale]);

  return null;
}
