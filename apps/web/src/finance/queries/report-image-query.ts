import { queryOptions } from "@tanstack/react-query";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { reportApiClient } from "../reports/report-api-client.ts";

const HOUR = 60 * 60 * 1000;

/** A Report's share image as a PNG. */
export const reportImageQuery = (
  id: string,
  options: { locale: SupportedLocale; includeNames: boolean },
) =>
  queryOptions({
    queryKey: ["finance", "report-image", id, options],
    queryFn: async ({ signal }) => {
      const response = await fetch(reportApiClient.imageUrl(id, options), {
        credentials: "same-origin",
        signal,
      });
      if (!response.ok) {
        throw new FinanceApiError("request-failed", response.status);
      }
      return response.blob();
    },
    staleTime: HOUR,
    gcTime: HOUR,
    retry: false,
  });
