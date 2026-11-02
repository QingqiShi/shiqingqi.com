import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/todos/[todoId]/snooze">,
) {
  return todoHandlers.snoozeReminder(request, (await params).todoId);
}
