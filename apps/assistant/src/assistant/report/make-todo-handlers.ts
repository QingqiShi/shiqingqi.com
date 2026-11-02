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
import { datesInOrder } from "./dates-in-order.ts";
import { ownerTodos, type TodoRefusal } from "./owner-todos.ts";
import { todoLimits } from "./todo-limits.ts";

const title = z.string().trim().min(1).max(todoLimits.titleChars);
const detail = z
  .string()
  .trim()
  .max(todoLimits.detailChars)
  .transform((text) => text || null);
const localDate = z.iso.date();
const instant = z.iso.datetime({ offset: true });

const interval = z.int().min(1).max(todoLimits.repeatInterval);
const repeatRule = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("daily"), every: interval }),
  z.strictObject({
    kind: z.literal("weekly"),
    every: interval,
    weekdays: z
      .array(z.int().min(1).max(7))
      .min(1)
      .refine((days) => days.every((day, i) => i === 0 || day > days[i - 1])),
  }),
  z.strictObject({
    kind: z.literal("monthly"),
    every: interval,
    day: z.union([z.int().min(1).max(31), z.literal("last")]),
  }),
  z.strictObject({
    kind: z.literal("yearly"),
    every: interval,
    month: z.int().min(1).max(12),
    day: z.int().min(1).max(31),
  }),
  z.strictObject({ kind: z.literal("after-done"), days: interval }),
]);

const addBody = z
  .strictObject({
    id: z.uuid(),
    title,
    detail: detail.nullable().default(null),
    dueDate: localDate.nullable().default(null),
    startDate: localDate.nullable().default(null),
  })
  .refine(datesInOrder);
const changeBody = z
  .strictObject({
    done: z.boolean().optional(),
    title: title.optional(),
    detail: detail.nullable().optional(),
    dueDate: localDate.nullable().optional(),
    startDate: localDate.nullable().optional(),
    repeat: repeatRule.nullable().optional(),
    remindAt: instant.nullable().optional(),
    nextId: z.uuid().optional(),
  })
  .refine((body) => Object.keys(body).length > 0);
const occurrenceBody = z
  .strictObject({
    dueDate: localDate.nullable(),
    startDate: localDate.nullable(),
    remindAt: instant.optional(),
  })
  .refine(datesInOrder);
const dueDatesBody = z.strictObject({
  changes: z
    .array(
      z.strictObject({
        id: z.uuid(),
        dueDate: localDate.nullable(),
        ownerSet: z.boolean(),
      }),
    )
    .min(1)
    .max(todoLimits.dueDateChanges),
});
const orderBody = z.strictObject({
  ids: z
    .array(z.uuid())
    .min(2)
    .max(todoLimits.orderedTodos)
    .refine((ids) => new Set(ids).size === ids.length),
});

const invalidBody = () =>
  assistantJson({ error: "invalid-body" }, { status: 400 });
const notFound = () => assistantJson({ error: "not-found" }, { status: 404 });
const saved = (found: boolean) => (found ? assistantNoContent() : notFound());
const refused = (refusal: TodoRefusal) =>
  refusal === "not-found"
    ? notFound()
    : assistantJson({ error: refusal }, { status: 409 });

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
        const refusal = await ownerTodos.change(scope, todoId, body.data, now);
        return refusal ? refused(refusal) : assistantNoContent();
      }),

    /** Skips an occurrence of a repeating to-do, or undoes that. */
    moveOccurrence: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, occurrenceBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        return saved(
          await ownerTodos.moveOccurrence(scope, todoId, body.data, now),
        );
      }),

    /** Asks for a to-do's reminder again later. */
    snoozeReminder: onTodo(ownerTodos.snoozeReminder),

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
        return typeof earlier === "string"
          ? refused(earlier)
          : assistantJson({ earlier });
      }),

    /** Puts to-dos in the order of the request. Other to-dos keep their places. */
    reorder: (request: Request) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, orderBody);
        if (!body.success) return invalidBody();
        await ownerTodos.reorder(scope, body.data.ids, now);
        return assistantNoContent();
      }),
  };
}
