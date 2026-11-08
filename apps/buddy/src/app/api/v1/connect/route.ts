import { getConnectHandlers } from "#src/server/connect/get-connect-handlers.ts";

export function POST(request: Request) {
  return getConnectHandlers().start(request);
}
