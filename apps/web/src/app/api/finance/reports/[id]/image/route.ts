import { reportHandlers } from "#src/finance/reports/report-handlers.ts";

export const maxDuration = 60;

export function GET(
  request: Request,
  context: RouteContext<"/api/finance/reports/[id]/image">,
) {
  return reportHandlers.image(request, context);
}
