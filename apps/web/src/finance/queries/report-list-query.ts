import { queryOptions } from "@tanstack/react-query";
import { reportApiClient } from "../reports/report-api-client.ts";
import { reportQuery } from "./report-query.ts";
import { REPORTS_MAX_AGE } from "./reports-persister.ts";

const MINUTE = 60 * 1000;

/**
 * Every Report without its data, newest week first. Each read marks the
 * stored Reports that the server wrote again since as stale, so they are
 * read again.
 */
export const reportListQuery = queryOptions({
  queryKey: ["finance", "reports"],
  queryFn: async ({ client }) => {
    const reports = await reportApiClient.list();
    for (const { id, generatedAt } of reports) {
      const { queryKey } = reportQuery(id);
      const stored = client.getQueryData(queryKey);
      if (stored !== undefined && stored.generatedAt !== generatedAt) {
        void client.invalidateQueries({ queryKey, exact: true });
      }
    }
    return reports;
  },
  staleTime: 5 * MINUTE,
  gcTime: REPORTS_MAX_AGE,
});
