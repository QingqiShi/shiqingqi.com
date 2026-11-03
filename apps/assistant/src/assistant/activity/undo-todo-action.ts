import { and, eq } from "drizzle-orm";
import {
  TODO_PLAIN_FIELDS,
  todoActionDetail,
  type TodoActionDetail,
  type TodoPlainField,
} from "#src/assistant/agent/todos/todo-action-detail.ts";
import {
  todoChecklistItems,
  todos,
  type TodoActionKind,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { takeBackNextOccurrence } from "#src/assistant/report/add-next-occurrence.ts";
import { datesInOrder } from "#src/assistant/report/dates-in-order.ts";

/** Why the undo of a change to a to-do did not happen. Nothing changed for it. */
export const TODO_UNDO_REFUSALS = [
  /** The to-do is deleted. */
  "todo-gone",
  /** The to-do changed since, and the undo would take that change away. */
  "todo-changed",
  /** The to-do is closed now. */
  "todo-closed",
] as const;
export type TodoUndoRefusal = (typeof TODO_UNDO_REFUSALS)[number];

type Scope = { tx: AssistantDb; userId: string; now: Date };
type Result = { refusal: TodoUndoRefusal } | { kept: TodoPlainField[] };

const UNDONE: Result = { kept: [] };

function selectRow({ tx, userId }: Scope, todoId: string) {
  return tx
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.id, todoId)))
    .for("update")
    .then((rows) => rows.at(0));
}
type TodoRow = NonNullable<Awaited<ReturnType<typeof selectRow>>>;

function writeRow(
  { tx, userId, now }: Scope,
  todoId: string,
  values: Partial<typeof todos.$inferInsert>,
) {
  return tx
    .update(todos)
    .set({ ...values, updatedAt: now })
    .where(and(eq(todos.userId, userId), eq(todos.id, todoId)));
}

/** The columns of a wait as the action stored them. */
function storedWait(fields: TodoActionDetail["before"]) {
  return {
    waitingOn: fields.waitingOn ?? null,
    followUpDate: fields.followUpDate ?? null,
    waitingSince: fields.waitingSince ? new Date(fields.waitingSince) : null,
    waitingNote: fields.waitingNote ?? null,
  };
}

function sameWait(row: TodoRow, fields: TodoActionDetail["after"]) {
  return (
    row.waitingOn === (fields.waitingOn ?? null) &&
    row.followUpDate === (fields.followUpDate ?? null) &&
    (row.waitingSince?.toISOString() ?? null) === (fields.waitingSince ?? null)
  );
}

/**
 * An added to-do goes as a soft delete, which the agent does not hear of as the
 * owner's. One that the owner has made their own stays, and one that is deleted
 * already stays the owner's delete.
 */
async function undoAdd(scope: Scope, todoId: string): Promise<Result> {
  const row = await selectRow(scope, todoId);
  if (!row || row.deletedAt) return UNDONE;
  const steps = await scope.tx
    .select({ id: todoChecklistItems.id })
    .from(todoChecklistItems)
    .where(
      and(
        eq(todoChecklistItems.userId, scope.userId),
        eq(todoChecklistItems.todoId, todoId),
      ),
    )
    .limit(1);
  if (
    row.ownerEditedFields.length > 0 ||
    row.doneAt ||
    row.repeat ||
    row.remindAt ||
    row.calendarAccountId ||
    steps.length > 0
  ) {
    return { refusal: "todo-changed" };
  }
  await writeRow(scope, todoId, {
    deletedAt: scope.now,
    addUndoneAt: scope.now,
  });
  return UNDONE;
}

/**
 * Each field returns to what it was, unless it changed after the action: then it
 * stays, and the rest go on. Dates that would then be out of order stay too.
 */
async function undoUpdate(
  scope: Scope,
  { todoId, before, after }: TodoActionDetail,
): Promise<Result> {
  const row = await selectRow(scope, todoId);
  if (!row || row.deletedAt) return { refusal: "todo-gone" };
  if (row.doneAt) return { refusal: "todo-closed" };
  const fields = TODO_PLAIN_FIELDS.filter((field) => field in after);
  const unchanged = fields.filter(
    (field) =>
      row[field] === after[field] && !row.ownerEditedFields.includes(field),
  );
  const restored = new Set<TodoPlainField>(unchanged);
  const values = Object.fromEntries(
    unchanged.map((field) => [field, before[field] ?? null]),
  );
  if (!datesInOrder({ ...row, ...values })) {
    restored.delete("dueDate");
    restored.delete("startDate");
    delete values.dueDate;
    delete values.startDate;
  }
  if (restored.size === 0) return { refusal: "todo-changed" };
  await writeRow(scope, todoId, values);
  return { kept: fields.filter((field) => !restored.has(field)) };
}

/** A wait goes back as a whole, and only when nobody changed it after the action. */
async function undoWait(
  scope: Scope,
  { todoId, before, after }: TodoActionDetail,
): Promise<Result> {
  const row = await selectRow(scope, todoId);
  if (!row || row.deletedAt) return { refusal: "todo-gone" };
  if (row.doneAt) return { refusal: "todo-closed" };
  if (!sameWait(row, after)) return { refusal: "todo-changed" };
  await writeRow(scope, todoId, storedWait(before));
  return UNDONE;
}

/**
 * The to-do opens again with the wait that the completion ended, and takes the
 * place of its next occurrence as when the owner reopens one. A later close is
 * not the agent's, so it stays.
 */
async function undoCompletion(
  scope: Scope,
  { todoId, before, doneAt }: TodoActionDetail,
): Promise<Result> {
  const row = await selectRow(scope, todoId);
  if (!row || row.deletedAt) return { refusal: "todo-gone" };
  if (!row.doneAt) return UNDONE;
  if (row.doneAt.toISOString() !== doneAt) return { refusal: "todo-changed" };
  const series = row.nextTodoId
    ? await takeBackNextOccurrence(scope.tx, scope, row.nextTodoId)
    : {};
  await writeRow(scope, todoId, {
    ...series,
    ...storedWait(before),
    doneAt: null,
    doneReason: null,
    nextTodoId: null,
  });
  return UNDONE;
}

/**
 * Takes back one change that the report agent made to a to-do, in the caller's
 * transaction. Gives the fields it left as they are, or why it did nothing.
 */
export function undoTodoAction(
  scope: Scope,
  kind: TodoActionKind,
  rawDetail: unknown,
): Promise<Result> {
  const detail = todoActionDetail.safeParse(rawDetail).data;
  if (!detail) return Promise.resolve({ refusal: "todo-gone" });
  switch (kind) {
    case "add_todo":
      return undoAdd(scope, detail.todoId);
    case "update_todo":
      return undoUpdate(scope, detail);
    case "mark_waiting":
    case "reply_came":
      return undoWait(scope, detail);
    case "complete_todo":
      return undoCompletion(scope, detail);
  }
}
