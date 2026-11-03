import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/waiting">,
) {
  return todoHandlers.changeWaiting(request, (await params).todoId);
}
