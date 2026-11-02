import { reportHandlers } from "#src/assistant/report/report-handlers.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/reports/[reportId]/seen">,
) {
  return reportHandlers.markSeen(request, (await params).reportId);
}
