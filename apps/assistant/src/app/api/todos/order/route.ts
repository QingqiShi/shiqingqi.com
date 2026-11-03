import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PUT(request: Request) {
  return todoHandlers.reorder(request);
}
