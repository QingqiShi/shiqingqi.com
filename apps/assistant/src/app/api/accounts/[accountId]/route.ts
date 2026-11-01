import { accountHandlers } from "#src/assistant/mail/accounts/account-handlers.ts";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/accounts/[accountId]">,
) {
  return accountHandlers.remove(request, (await params).accountId);
}
