import { getAccountHandlers } from "#src/server/account/get-account-handlers.ts";

export function GET(request: Request) {
  return getAccountHandlers().ownPetState(request);
}
