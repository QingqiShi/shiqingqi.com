import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/checklist/[stepId]">,
) {
  const { todoId, stepId } = await params;
  return todoHandlers.changeStep(request, todoId, stepId);
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/checklist/[stepId]">,
) {
  const { todoId, stepId } = await params;
  return todoHandlers.deleteStep(request, todoId, stepId);
}
