import { z } from "zod";
import type { CalendarDeps } from "#src/assistant/agent/calendar/run-calendars.ts";
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
import { ownerChecklist } from "./owner-checklist.ts";
import { ownerTodos, type TodoRefusal } from "./owner-todos.ts";
import {
  freeSlotOfSkippedTodo,
  freeSlotsOfClosedTodos,
  todoCalendarSlots,
  type SlotRefusal,
} from "./todo-calendar-slots.ts";
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
    ticked: z.array(z.uuid()).max(todoLimits.orderedTodos).default([]),
  })
  .refine(datesInOrder);
const waitingOn = z.string().trim().min(1).max(todoLimits.waitingOnChars);
const followUpDate = localDate.nullable();
const waitingBody = z.union([
  z
    .strictObject({ waitingOn: waitingOn.nullable(), followUpDate })
    .refine((body) => body.waitingOn !== null || body.followUpDate === null),
  z.strictObject({
    restore: z
      .strictObject({
        waitingOn: waitingOn.nullable(),
        followUpDate,
        waitingSince: instant.nullable(),
        waitingNote: z.string().nullable(),
        ownerSet: z.strictObject({
          waitingOn: z.boolean(),
          followUpDate: z.boolean(),
        }),
      })
      .refine(
        (body) =>
          (body.waitingOn === null) === (body.waitingSince === null) &&
          (body.waitingOn !== null || body.followUpDate === null),
      ),
  }),
]);
const dueDatesBody = z.strictObject({
  changes: z
    .array(
      z.strictObject({
        id: z.uuid(),
        dueDate: localDate.nullable(),
        ownerSet: z.boolean(),
        start: z
          .strictObject({
            date: localDate.nullable(),
            ownerSet: z.boolean(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(todoLimits.bulkTodos),
});
const bulkIds = z
  .array(z.uuid())
  .min(1)
  .max(todoLimits.bulkTodos)
  .refine((ids) => new Set(ids).size === ids.length);
const bulkBody = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("done"),
    todos: z
      .array(z.strictObject({ id: z.uuid(), nextId: z.uuid().optional() }))
      .min(1)
      .max(todoLimits.bulkTodos)
      .refine(
        (todos) => new Set(todos.map(({ id }) => id)).size === todos.length,
      ),
  }),
  z.strictObject({ action: z.literal("reopen"), ids: bulkIds }),
  z.strictObject({ action: z.literal("delete"), ids: bulkIds }),
  z.strictObject({ action: z.literal("restore"), ids: bulkIds }),
  z.strictObject({
    action: z.literal("reject"),
    ids: bulkIds,
    note: z
      .string()
      .trim()
      .max(todoLimits.rejectionNoteChars)
      .transform((text) => text || null),
  }),
]);
const orderBody = z.strictObject({
  ids: z
    .array(z.uuid())
    .min(2)
    .max(todoLimits.orderedTodos)
    .refine((ids) => new Set(ids).size === ids.length),
});
const stepText = z.string().trim().min(1).max(todoLimits.checklistItemChars);
const addStepBody = z.strictObject({
  id: z.uuid(),
  text: stepText,
  done: z.boolean().default(false),
  position: z.int32().positive().optional(),
});
const changeStepBody = z
  .strictObject({ text: stepText.optional(), done: z.boolean().optional() })
  .refine((body) => Object.keys(body).length > 0);

const slotTime = z
  .strictObject({ start: instant, end: instant })
  .refine(
    ({ start, end }) =>
      Date.parse(end) > Date.parse(start) &&
      Date.parse(end) - Date.parse(start) <= todoLimits.slotMs,
  );
const addSlotBody = z.strictObject({ name: z.uuid(), time: slotTime });

function timesOf({ start, end }: { start: string; end: string }) {
  return { start: new Date(start), end: new Date(end) };
}

const invalidBody = () =>
  assistantJson({ error: "invalid-body" }, { status: 400 });
const notFound = () => assistantJson({ error: "not-found" }, { status: 404 });
const saved = (found: boolean) => (found ? assistantNoContent() : notFound());
const refused = (refusal: TodoRefusal) =>
  refusal === "not-found"
    ? notFound()
    : assistantJson({ error: refusal }, { status: 409 });

const refusedSlot = (refusal: SlotRefusal) => {
  if (refusal === "not-found") return notFound();
  return assistantJson(
    { error: refusal },
    { status: refusal === "calendar-unreachable" ? 502 : 409 },
  );
};
const slotSaved = (refusal: SlotRefusal | null) =>
  refusal ? refusedSlot(refusal) : assistantNoContent();

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
    getCalendarDeps: () => CalendarDeps | null;
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

  /** The answer to a write that can end a to-do: what became of the time it held, when it held any. */
  const calendarAnswer = (
    calendar: readonly unknown[],
    body: Record<string, unknown> = {},
  ) =>
    calendar.length === 0 && Object.keys(body).length === 0
      ? assistantNoContent()
      : assistantJson(calendar.length === 0 ? body : { ...body, calendar });

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
        if (refusal) return refused(refusal);
        return body.data.done === true
          ? calendarAnswer(
              await freeSlotsOfClosedTodos(scope, deps.getCalendarDeps(), now, [
                todoId,
              ]),
            )
          : assistantNoContent();
      }),

    /** Skips an occurrence of a repeating to-do, or undoes that. */
    moveOccurrence: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, occurrenceBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        if (!(await ownerTodos.moveOccurrence(scope, todoId, body.data, now))) {
          return notFound();
        }
        return calendarAnswer(
          await freeSlotOfSkippedTodo(
            scope,
            deps.getCalendarDeps(),
            todoId,
            now,
          ),
        );
      }),

    /** Makes a to-do wait, changes its wait or ends it, and answers with what it was. Or puts that back. */
    changeWaiting: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, waitingBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        if ("restore" in body.data) {
          return saved(
            await ownerTodos.restoreWaiting(
              scope,
              todoId,
              body.data.restore,
              now,
            ),
          );
        }
        const earlier = await ownerTodos.changeWaiting(
          scope,
          todoId,
          body.data,
          now,
        );
        return earlier ? assistantJson({ earlier }) : notFound();
      }),

    /** Asks for a to-do's reminder again later. */
    snoozeReminder: onTodo(ownerTodos.snoozeReminder),

    delete: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        if (!isTodoId(todoId)) return notFound();
        if (!(await ownerTodos.delete(scope, todoId, now))) return notFound();
        return calendarAnswer(
          await freeSlotsOfClosedTodos(scope, deps.getCalendarDeps(), now, [
            todoId,
          ]),
        );
      }),

    restore: onTodo(ownerTodos.restore),

    removeRejection: onTodo(ownerTodos.removeRejection),

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

    /** Closes or deletes many to-dos, undoes that, or says that the report should not have added them, in one transaction. */
    bulk: (request: Request) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, bulkBody);
        if (!body.success) return invalidBody();
        const { data } = body;
        switch (data.action) {
          case "done": {
            const closed = await ownerTodos.closeMany(scope, data.todos, now);
            return typeof closed === "string"
              ? refused(closed)
              : calendarAnswer(
                  await freeSlotsOfClosedTodos(
                    scope,
                    deps.getCalendarDeps(),
                    now,
                    closed,
                  ),
                  { closed },
                );
          }
          case "reopen":
            return saved(await ownerTodos.reopenMany(scope, data.ids, now));
          case "delete":
            if (!(await ownerTodos.deleteMany(scope, data.ids, now))) {
              return notFound();
            }
            return calendarAnswer(
              await freeSlotsOfClosedTodos(
                scope,
                deps.getCalendarDeps(),
                now,
                data.ids,
              ),
            );
          case "restore":
            return saved(await ownerTodos.restoreMany(scope, data.ids, now));
          case "reject":
            return saved(
              await ownerTodos.rejectMany(scope, data.ids, data.note, now),
            );
        }
      }),

    /** Puts to-dos in the order of the request. Other to-dos keep their places. */
    reorder: (request: Request) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, orderBody);
        if (!body.success) return invalidBody();
        await ownerTodos.reorder(scope, body.data.ids, now);
        return assistantNoContent();
      }),

    /** Puts time for a to-do on the default calendar, and names that calendar. */
    addSlot: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, addSlotBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        const added = await todoCalendarSlots.add(
          scope,
          deps.getCalendarDeps(),
          todoId,
          { name: body.data.name, ...timesOf(body.data.time) },
          now,
        );
        return typeof added === "string"
          ? refusedSlot(added)
          : assistantJson(added, { status: 201 });
      }),

    /** Moves the time that a to-do holds on the calendar. */
    moveSlot: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        const body = await readBody(request, slotTime);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        return slotSaved(
          await todoCalendarSlots.move(
            scope,
            deps.getCalendarDeps(),
            todoId,
            timesOf(body.data),
            now,
          ),
        );
      }),

    /** Takes the time that a to-do holds off the calendar. */
    removeSlot: (request: Request, todoId: string) =>
      withSession(request, async (scope) => {
        if (!isTodoId(todoId)) return notFound();
        return slotSaved(
          await todoCalendarSlots.remove(scope, deps.getCalendarDeps(), todoId),
        );
      }),

    /** Takes the time from the calendar, after a write found that the event changed. */
    adoptSlot: (request: Request, todoId: string) =>
      withSession(request, async (scope, now) => {
        if (!isTodoId(todoId)) return notFound();
        return slotSaved(
          await todoCalendarSlots.adopt(
            scope,
            deps.getCalendarDeps(),
            todoId,
            now,
          ),
        );
      }),

    /** Adds a step to a to-do's checklist, or brings back one that was deleted. */
    addStep: (request: Request, todoId: string) =>
      withSession(request, async (scope) => {
        const body = await readBody(request, addStepBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        const refusal = await ownerChecklist.add(scope, todoId, body.data);
        return refusal
          ? refused(refusal)
          : assistantJson({ id: body.data.id }, { status: 201 });
      }),

    /** Ticks a step of a checklist, or changes its text. */
    changeStep: (request: Request, todoId: string, stepId: string) =>
      withSession(request, async (scope) => {
        const body = await readBody(request, changeStepBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId) || !isTodoId(stepId)) return notFound();
        return saved(
          await ownerChecklist.change(scope, todoId, stepId, body.data),
        );
      }),

    /** Deletes a step of a checklist, and answers with its place, for an undo. */
    deleteStep: (request: Request, todoId: string, stepId: string) =>
      withSession(request, async (scope) => {
        if (!isTodoId(todoId) || !isTodoId(stepId)) return notFound();
        const position = await ownerChecklist.delete(scope, todoId, stepId);
        return position === null ? notFound() : assistantJson({ position });
      }),

    /** Puts the steps of a checklist in the order of the request. */
    reorderSteps: (request: Request, todoId: string) =>
      withSession(request, async (scope) => {
        const body = await readBody(request, orderBody);
        if (!body.success) return invalidBody();
        if (!isTodoId(todoId)) return notFound();
        await ownerChecklist.reorder(scope, todoId, body.data.ids);
        return assistantNoContent();
      }),
  };
}
