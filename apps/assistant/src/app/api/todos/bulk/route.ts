import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function POST(request: Request) {
  return todoHandlers.bulk(request);
}
