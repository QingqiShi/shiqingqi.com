import { captureHandlers } from "#src/assistant/report/capture-handlers.ts";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/settings/capture-tokens/[tokenId]">,
) {
  return captureHandlers.revokeToken(request, (await params).tokenId);
}
