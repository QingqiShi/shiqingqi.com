import { getAccountHandlers } from "#src/server/account/get-account-handlers.ts";

export function POST(request: Request) {
  return getAccountHandlers().setVisibility(request);
}
