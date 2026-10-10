import { queryOptions } from "@tanstack/react-query";
import { reportApiClient } from "../reports/report-api-client.ts";
import { REPORTS_MAX_AGE } from "./reports-persister.ts";

const MINUTE = 60 * 1000;

/** Every Report without its data, newest week first. */
export const reportListQuery = queryOptions({
  queryKey: ["finance", "reports"],
  queryFn: () => reportApiClient.list(),
  staleTime: 5 * MINUTE,
  gcTime: REPORTS_MAX_AGE,
});
