import { useQuery } from "@tanstack/react-query";
import { reportListQuery } from "../queries/report-list-query.ts";

/** Every Report without its data, newest week first. */
export function useReportList() {
  return useQuery(reportListQuery);
}
