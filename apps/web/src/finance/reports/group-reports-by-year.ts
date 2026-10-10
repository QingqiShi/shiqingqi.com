import type { ReportListItem } from "./report-api-schemas.ts";

interface ReportYear {
  /** The year the weeks end in. */
  year: string;
  reports: readonly ReportListItem[];
}

/** Splits Reports, newest first, into one run per year of their week end. */
export function groupReportsByYear(
  reports: readonly ReportListItem[],
): ReportYear[] {
  const years: { year: string; reports: ReportListItem[] }[] = [];
  for (const report of reports) {
    const year = report.periodEnd.slice(0, 4);
    const last = years.at(-1);
    if (last?.year === year) last.reports.push(report);
    else years.push({ year, reports: [report] });
  }
  return years;
}
