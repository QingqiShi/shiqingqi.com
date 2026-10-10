import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryClient, QueryKey, QueryState } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import { createStore, del, get, set } from "idb-keyval";
import type { ReportListItem } from "../reports/report-api-schemas.ts";

const DAY = 24 * 60 * 60 * 1000;

/** How long a device keeps the Reports it read without reading them again. */
// This value is also the gcTime. Keep it below 2^31 - 1 ms (about 24 days):
// setTimeout runs a longer delay at once, and then React Query removes the
// queries immediately.
export const REPORTS_MAX_AGE = 21 * DAY;

const reportsStore = createStore("finance-reports", "queries");

export function reportsPersistKey(householdId: string) {
  return `finance-reports-${householdId}`;
}

/**
 * The Reports list and every Report this device read, stored as one value per
 * Household. A Report that the last list does not hold is not stored.
 */
export function shouldPersistReportsQuery(
  client: QueryClient,
  query: { queryKey: QueryKey; state: Pick<QueryState, "data"> },
) {
  if (query.state.data === undefined) return false;
  const [scope, kind, id] = query.queryKey;
  if (scope !== "finance") return false;
  if (kind === "reports") return true;
  if (kind !== "report") return false;
  const list = client.getQueryData<ReportListItem[]>(["finance", "reports"]);
  return list === undefined || list.some((report) => report.id === id);
}

interface ReportsPersister {
  persister: Persister;
  /** Deletes the stored Reports. This persister writes nothing after it. */
  clear: () => Promise<void>;
}

const persisters = new Map<string, ReportsPersister>();

function createReportsPersister(householdId: string): ReportsPersister {
  const key = reportsPersistKey(householdId);
  let cleared = false;
  return {
    persister: createAsyncStoragePersister({
      key,
      storage: {
        getItem: (item) => get<string>(item, reportsStore),
        setItem: async (item, value) => {
          if (!cleared) await set(item, value, reportsStore);
        },
        removeItem: (item) => del(item, reportsStore),
      },
    }),
    async clear() {
      cleared = true;
      persisters.delete(householdId);
      await del(key, reportsStore);
    },
  };
}

/** The Household's Reports persister, one for each Household in this tab. */
export function reportsPersister(householdId: string) {
  let persister = persisters.get(householdId);
  if (!persister) {
    persister = createReportsPersister(householdId);
    persisters.set(householdId, persister);
  }
  return persister;
}
