import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function POST(request: Request) {
  return todoHandlers.add(request);
}

export async function PATCH(request: Request) {
  return todoHandlers.changeDueDates(request);
}
