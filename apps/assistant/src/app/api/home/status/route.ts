import { homeHandlers } from "#src/assistant/home/home-handlers.ts";

export function GET(request: Request) {
  return homeHandlers.status(request);
}
