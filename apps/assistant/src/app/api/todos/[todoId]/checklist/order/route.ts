import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/checklist/order">,
) {
  return todoHandlers.reorderSteps(request, (await params).todoId);
}
