import type { ReportRow } from "../sync/row-schemas.ts";

/** The Reports of the week before and the week after `id`, from a newest-first list. */
export function adjacentReports(
  reports: readonly ReportRow[],
  id: string,
): { older: ReportRow | null; newer: ReportRow | null } {
  const index = reports.findIndex((report) => report.id === id);
  if (index === -1) return { older: null, newer: null };
  return {
    older: reports.at(index + 1) ?? null,
    newer: index > 0 ? reports[index - 1] : null,
  };
}
