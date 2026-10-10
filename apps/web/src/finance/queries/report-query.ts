import { queryOptions } from "@tanstack/react-query";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { reportApiClient } from "../reports/report-api-client.ts";

const HOUR = 60 * 60 * 1000;

/**
 * One Report with its data. A Report stored with an older data version is
 * built again first, when its week end is known.
 */
export const reportQuery = (id: string, periodEnd: string | null) =>
  queryOptions({
    queryKey: ["finance", "report", id],
    queryFn: async () => {
      try {
        return await reportApiClient.getReport(id);
      } catch (error) {
        if (
          !(error instanceof FinanceApiError) ||
          error.code !== "outdated" ||
          periodEnd === null
        ) {
          throw error;
        }
        await reportApiClient.regenerate(periodEnd);
        return reportApiClient.getReport(id);
      }
    },
    staleTime: HOUR,
    gcTime: HOUR,
    retry: (failureCount, error) =>
      !(error instanceof FinanceApiError && error.status < 500) &&
      failureCount < 2,
  });
