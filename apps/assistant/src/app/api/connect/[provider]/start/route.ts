import { connectHandlers } from "#src/assistant/mail/oauth/connect-handlers.ts";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/connect/[provider]/start">,
) {
  return connectHandlers.start(request, (await params).provider);
}
