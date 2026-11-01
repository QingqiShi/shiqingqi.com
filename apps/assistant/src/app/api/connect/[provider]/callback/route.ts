import { connectHandlers } from "#src/assistant/mail/oauth/connect-handlers.ts";

export const maxDuration = 90;

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/connect/[provider]/callback">,
) {
  return connectHandlers.callback(request, (await params).provider);
}
