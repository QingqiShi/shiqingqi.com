import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/occurrence">,
) {
  return todoHandlers.moveOccurrence(request, (await params).todoId);
}
