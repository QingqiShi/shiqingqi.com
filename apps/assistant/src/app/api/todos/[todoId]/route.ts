import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]">,
) {
  return todoHandlers.update(request, (await params).todoId);
}
