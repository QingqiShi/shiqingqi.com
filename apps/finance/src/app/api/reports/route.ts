import { reportHandlers } from "#src/finance/reports/report-handlers.ts";

export function GET(request: Request) {
  return reportHandlers.listReports(request);
}
