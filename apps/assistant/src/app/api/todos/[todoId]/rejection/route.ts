import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/rejection">,
) {
  return todoHandlers.removeRejection(request, (await params).todoId);
}
