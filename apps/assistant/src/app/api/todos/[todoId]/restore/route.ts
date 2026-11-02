import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/restore">,
) {
  return todoHandlers.restore(request, (await params).todoId);
}
