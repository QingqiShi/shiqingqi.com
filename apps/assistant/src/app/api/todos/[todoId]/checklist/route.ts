import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/checklist">,
) {
  return todoHandlers.addStep(request, (await params).todoId);
}
