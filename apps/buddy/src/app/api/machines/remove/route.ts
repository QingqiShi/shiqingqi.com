import { getMachineHandlers } from "#src/server/machines/get-machine-handlers.ts";

export function POST(request: Request) {
  return getMachineHandlers().remove(request);
}
