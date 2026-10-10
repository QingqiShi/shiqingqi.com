import { reportHandlers } from "#src/finance/reports/report-handlers.ts";

export function GET(
  request: Request,
  context: RouteContext<"/api/finance/reports/[id]">,
) {
  return reportHandlers.getReport(request, context);
}

export function DELETE(
  request: Request,
  context: RouteContext<"/api/finance/reports/[id]">,
) {
  return reportHandlers.remove(request, context);
}
