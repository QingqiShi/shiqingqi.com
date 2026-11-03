import { todoHandlers } from "#src/assistant/report/todo-handlers.ts";

type Context = RouteContext<"/api/todos/[todoId]/calendar">;

export async function POST(request: Request, { params }: Context) {
  return todoHandlers.addSlot(request, (await params).todoId);
}

export async function PUT(request: Request, { params }: Context) {
  return todoHandlers.moveSlot(request, (await params).todoId);
}

export async function PATCH(request: Request, { params }: Context) {
  return todoHandlers.adoptSlot(request, (await params).todoId);
}

export async function DELETE(request: Request, { params }: Context) {
  return todoHandlers.removeSlot(request, (await params).todoId);
}
