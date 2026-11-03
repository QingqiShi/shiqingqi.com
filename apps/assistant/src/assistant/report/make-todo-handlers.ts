import { z } from "zod";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import {
  assistantJson,
  assistantNoContent,
} from "#src/assistant/http/assistant-json.ts";
import {
  guardRequest,
  type RequestGuardDependencies,
} from "#src/assistant/http/guard-request.ts";
import { ownerTodos } from "./owner-todos.ts";
import { todoLimits } from "./todo-limits.ts";

const title = z.string().trim().min(1).max(todoLimits.titleChars);
const detail = z
  .string()
  .trim()
  .max(todoLimits.detailChars)
  .transform((text) => text || null);
const dueDate = z.iso.date();

const addBody = z.strictObject({
  id: z.uuid(),
  title,
  detail: detail.nullable().default(null),
  dueDate: dueDate.nullable().default(null),
});
const changeBody = z
  .strictObject({
    done: z.boolean().optional(),
    title: title.optional(),
    detail: detail.nullable().optional(),
    dueDate: dueDate.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0);
const dueDatesBody = z.strictObject({
  changes: z
    .array(
      z.strictObject({
        id: z.uuid(),
        dueDate: dueDate.nullable(),
        ownerSet: z.boolean(),
      }),
    )
    .min(1)
    .max(todoLimits.dueDateChanges),
});

const invalidBody = () =>
  assistantJson({ error: "invalid-body" }, { status: 400 });
const notFound = () => assistantJson({ error: "not-found" }, { status: 404 });
const saved = (found: boolean) => (found ? assistantNoContent() : notFound());

const isTodoId = (todoId: string) => z.uuid().safeParse(todoId).success;

async function readBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
) {
  return schema.safeParse(await request.json().catch(() => null));
}

export function makeTodoHandlers(
  deps: RequestGuardDependencies & {
    getDb: () => AssistantDb;
    now: () => Date;
  },
) {
  async function withSession(
    request: Request,
    handle: (scope: UserScope, now: Date) => Promise<Response>,
  ): Promise<Response> {
    const session = await guardRequest(deps, request, { write: true });
    if (session instanceof Response) return session;
    return handle({ db: deps.getDb(), userId: session.userId }, deps.now());
  }

  /** A request that names a to-do and sends nothing else. */
  const onTodo =
    (
      write: (scope: UserScope, todoId: string, now: Date) => Promise<boolean>,
    ) =>
    (request: Request, todoId: string) =>
      withSession(request, async (scope, now) =>
        isTodoId(todoId) ? saved(await write(scope, todoId, now)) : notFound(),
      );

  return {
    add: (request: Request) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, addBody);
        if (!body.success) return invalidBody();
        return (await ownerTodos.add(scope, body.data, now))
          ? assistantJson({ id: body.data.id }, { status: 201 })
          : assistantJson({ error: "id-taken" }, { status: 409 });
      }),

    /** Ticks a to-do off or opens it again, and changes its fields. */
    update: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, changeBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        return saved(await ownerTodos.change(scope, todoId, body.data, now));
      }),

    delete: onTodo(ownerTodos.delete),

    restore: onTodo(ownerTodos.restore),

    /** Sets the due dates of many to-dos, all or none, and answers with what they were. */
    changeDueDates: (request: Request) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, dueDatesBody);
        if (!body.success) return invalidBody();
        const earlier = await ownerTodos.changeDueDates(
          scope,
          body.data.changes,
          now,
        );
        return earlier ? assistantJson({ earlier }) : notFound();
      }),
  };
}
