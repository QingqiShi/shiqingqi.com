"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";

/** The IndexedDB database where an earlier version of the app kept the Reports. */
const LEGACY_REPORTS_DB = "finance-reports";

/**
 * React Query for the Finance screens that read the server directly, such as
 * the Reports. The service worker keeps the last answer of each Reports read,
 * so they show offline. When sign-out in another tab deletes the Replica, this
 * tab forgets them too.
 */
export function FinanceQueryProvider({ children }: { children: ReactNode }) {
  const { runtime } = useFinanceRuntime();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              !(error instanceof FinanceApiError && error.status < 500) &&
              failureCount < 2,
          },
        },
      }),
  );

  useEffect(() => {
    // An open tab of the earlier version can block this delete. Do not wait
    // for it: IndexedDB deletes the database when that tab closes.
    indexedDB.deleteDatabase(LEGACY_REPORTS_DB);
  }, []);

  useEffect(
    () =>
      runtime.onReplicaDeleted(() => {
        client.clear();
      }),
    [runtime, client],
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
