import { queryOptions } from "@tanstack/react-query";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { reportApiClient } from "../reports/report-api-client.ts";
import { reportApiSchemas } from "../reports/report-api-schemas.ts";
import { REPORTS_MAX_AGE } from "./reports-persister.ts";

const HOUR = 60 * 60 * 1000;

/** One Report with its data. A Report stored with an older data version is built again first. */
export const reportQuery = (id: string) =>
  queryOptions({
    queryKey: ["finance", "report", id],
    queryFn: async () => {
      try {
        return await reportApiClient.getReport(id);
      } catch (error) {
        const outdated = reportApiSchemas.outdated.safeParse(
          error instanceof FinanceApiError ? error.body : null,
        );
        if (!outdated.success) throw error;
        await reportApiClient.regenerate(outdated.data.periodEnd);
        return reportApiClient.getReport(id);
      }
    },
    staleTime: HOUR,
    gcTime: REPORTS_MAX_AGE,
  });
