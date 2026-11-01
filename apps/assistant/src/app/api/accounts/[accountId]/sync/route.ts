import { accountHandlers } from "#src/assistant/mail/accounts/account-handlers.ts";

export const maxDuration = 90;

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/accounts/[accountId]/sync">,
) {
  return accountHandlers.syncNow(request, (await params).accountId);
}
