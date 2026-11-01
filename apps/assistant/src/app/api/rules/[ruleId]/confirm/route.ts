import { digestHandlers } from "#src/assistant/digest/digest-handlers.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/rules/[ruleId]/confirm">,
) {
  return digestHandlers.confirmRule(request, (await params).ruleId);
}
