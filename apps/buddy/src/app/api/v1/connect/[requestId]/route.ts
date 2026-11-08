import { getConnectHandlers } from "#src/server/connect/get-connect-handlers.ts";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/connect/[requestId]">,
) {
  const { requestId } = await params;
  return getConnectHandlers().poll(request, requestId);
}
