"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useState, type ReactNode } from "react";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { WEEKLY_REPORT_SCHEMA_VERSION } from "../reports/weekly-report-data-schema.ts";
import { reportListQuery } from "./report-list-query.ts";
import {
  REPORTS_MAX_AGE,
  reportsPersister,
  shouldPersistReportsQuery,
} from "./reports-persister.ts";

/**
 * React Query for the Finance screens that read the server directly, such as
 * the Reports. The Reports this device read are kept in IndexedDB, so they
 * show offline; each page load reads the list from the server again. When
 * sign-out in another tab deletes the Replica, this tab forgets them too.
 */
export function FinanceQueryProvider({ children }: { children: ReactNode }) {
  const { runtime, householdId } = useFinanceRuntime();
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
          hydrate: { queries: { gcTime: REPORTS_MAX_AGE } },
        },
      }),
  );
  const [reports] = useState(() => reportsPersister(householdId));
  const [persistOptions] = useState(() => ({
    persister: reports.persister,
    maxAge: REPORTS_MAX_AGE,
    buster: String(WEEKLY_REPORT_SCHEMA_VERSION),
    dehydrateOptions: {
      shouldDehydrateQuery: (
        query: Parameters<typeof shouldPersistReportsQuery>[1],
      ) => shouldPersistReportsQuery(client, query),
    },
  }));

  useEffect(
    () =>
      runtime.onReplicaDeleted(() => {
        void reports.clear().catch(() => undefined);
        client.clear();
      }),
    [runtime, reports, client],
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      onSuccess={() =>
        client.invalidateQueries({
          queryKey: reportListQuery.queryKey,
          exact: true,
        })
      }
    >
      {children}
    </PersistQueryClientProvider>
  );
}
