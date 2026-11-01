import { digestHandlers } from "#src/assistant/digest/digest-handlers.ts";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/rules/[ruleId]">,
) {
  return digestHandlers.dismissRule(request, (await params).ruleId);
}
