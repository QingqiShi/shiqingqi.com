import { financeFetch } from "../http/finance-fetch.ts";
import {
  reportApiSchemas,
  type RegenerateReportResponse,
  type ReportListItem,
  type WeeklyReportResponse,
} from "./report-api-schemas.ts";

async function send(path: string, init?: RequestInit): Promise<unknown> {
  const response = await financeFetch(path, init);
  const body: unknown = await response.json();
  return body;
}

function reportPath(id: string) {
  return `/api/reports/${encodeURIComponent(id)}`;
}

/** Fetch wrappers for the Reports screens. */
export const reportApiClient = {
  /** Every Report without its data, newest week first. */
  async list(): Promise<ReportListItem[]> {
    return reportApiSchemas.list.parse(await send("/api/reports")).reports;
  },

  /** One Report with its data. Code `outdated` means it needs `regenerate` of the `periodEnd` in the error body. */
  async getReport(id: string): Promise<WeeklyReportResponse> {
    return reportApiSchemas.report.parse(await send(reportPath(id)));
  },

  /** Builds the Report of the week that holds `periodEnd` (default: last week) again. */
  async regenerate(periodEnd?: string): Promise<RegenerateReportResponse> {
    return reportApiSchemas.regenerate.parse(
      await send("/api/reports/regenerate", {
        method: "POST",
        body: JSON.stringify(periodEnd === undefined ? {} : { periodEnd }),
      }),
    );
  },
};
