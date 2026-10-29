import { reportHandlers } from "#src/finance/reports/report-handlers.ts";

export function POST(request: Request) {
  return reportHandlers.regenerate(request);
}
