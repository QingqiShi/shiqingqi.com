import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { changeDueDates } from "./change-due-dates.ts";
import { changeWaiting, restoreWaiting } from "./change-waiting.ts";
import {
  closeTodos,
  deleteTodos,
  notDeleted,
  rejectTodos,
  reopenTodos,
  restoreTodos,
} from "./close-todos.ts";
import { datesInOrder } from "./dates-in-order.ts";
import { liveTodo, ownTodo } from "./own-todo.ts";
import { placesInOrder } from "./rearrange.ts";
import { withOwnerFields } from "./with-owner-field.ts";

interface NewOwnerTodo {
  /** Made by the page, so that it can show the row and change it before the row is stored. */
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
}

export interface OwnerTodoChange {
  done?: boolean;
  title?: string;
  detail?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
}

/** Why a change of an existing to-do did not happen. */
export type TodoRefusal = "not-found" | "start-after-due" | "id-taken";

/** The fields of `todos` that a change of `OwnerTodoChange` can set. A wait is written on its own. */
const PLAIN_FIELDS = ["title", "detail", "dueDate", "startDate"] as const;

/** Stores a to-do that the owner wrote. False when that id is taken. */
async function addTodo(
  { db, userId }: UserScope,
  todo: NewOwnerTodo,
  now: Date,
): Promise<boolean> {
  const added = await db
    .insert(todos)
    .values({
      ...todo,
      userId,
      createdBy: "owner",
      ownerEditedFields: PLAIN_FIELDS.filter((field) => todo[field] !== null),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: todos.id })
    .returning({ id: todos.id });
  return added.length > 0;
}

/** The fields that a change makes the owner's. */
function fieldsOwnerSets(change: OwnerTodoChange) {
  return PLAIN_FIELDS.filter((field) => change[field] !== undefined);
}

/** Changes a to-do of the owner's, or says why it did not. */
async function changeTodo(
  scope: UserScope,
  todoId: string,
  change: OwnerTodoChange,
  now: Date,
): Promise<TodoRefusal | null> {
  const { done, ...edit } = change;
  const fields = fieldsOwnerSets(change);
  return scope.db.transaction(async (tx) => {
    const row = (
      await tx
        .select({ dueDate: todos.dueDate, startDate: todos.startDate })
        .from(todos)
        .where(liveTodo(scope, todoId))
        .for("update")
    ).at(0);
    if (!row) return "not-found";
    const { startDate = row.startDate, dueDate = row.dueDate } = edit;
    if (!datesInOrder({ startDate, dueDate })) return "start-after-due";
    await tx
      .update(todos)
      .set({
        ...edit,
        ...(fields.length > 0
          ? { ownerEditedFields: withOwnerFields(fields) }
          : {}),
        ...(done === true
          ? {
              doneAt: sql`coalesce(${todos.doneAt}, ${now.toISOString()}::timestamptz)`,
            }
          : {}),
        ...(done === false ? { doneAt: null, doneReason: null } : {}),
        updatedAt: now,
      })
      .where(liveTodo(scope, todoId));
    return null;
  });
}

/** Hides a to-do of the owner's. False when the user has no such to-do. */
async function deleteTodo(
  scope: UserScope,
  todoId: string,
  now: Date,
): Promise<boolean> {
  const deleted = await scope.db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(liveTodo(scope, todoId))
    .returning({ id: todos.id });
  return deleted.length > 0;
}

/** Brings a deleted to-do back. False when the user has no such deleted to-do. */
async function restoreTodo(
  { db, userId }: UserScope,
  todoId: string,
  now: Date,
): Promise<boolean> {
  const restored = await db
    .update(todos)
    .set({ ...notDeleted, updatedAt: now })
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.id, todoId),
        isNotNull(todos.deletedAt),
      ),
    )
    .returning({ id: todos.id });
  return restored.length > 0;
}

/** Takes a rejection away, and the to-do stays deleted. False when the user has no such rejection. */
async function removeRejection(
  { db, userId }: UserScope,
  todoId: string,
  now: Date,
): Promise<boolean> {
  const removed = await db
    .update(todos)
    .set({ rejectedAt: null, rejectionNote: null, updatedAt: now })
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.id, todoId),
        isNotNull(todos.rejectedAt),
      ),
    )
    .returning({ id: todos.id });
  return removed.length > 0;
}

/**
 * Puts the listed to-dos in the listed order, in the positions that they hold,
 * so that every other to-do keeps its own. A row that is gone or is someone
 * else's counts for nothing.
 */
async function reorderTodos(
  scope: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<void> {
  await scope.db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: todos.id, position: todos.position })
      .from(todos)
      .where(and(ownTodo(scope), inArray(todos.id, [...ids])))
      .for("update");
    if (rows.length < 2) return;
    const places = placesInOrder(rows, ids).map(
      ({ id, position }) => sql`(${id}::uuid, ${position}::integer)`,
    );
    await tx
      .update(todos)
      .set({ position: sql`placed.position`, updatedAt: now })
      .from(sql`(values ${sql.join(places, sql`, `)}) as placed(id, position)`)
      .where(and(ownTodo(scope), sql`${todos.id} = placed.id`));
  });
}

/** What the owner can write in their to-dos. Each takes the user from the session. */
export const ownerTodos = {
  add: addTodo,
  change: changeTodo,
  changeWaiting,
  restoreWaiting,
  delete: deleteTodo,
  restore: restoreTodo,
  changeDueDates,
  closeMany: closeTodos,
  reopenMany: reopenTodos,
  deleteMany: deleteTodos,
  restoreMany: restoreTodos,
  rejectMany: rejectTodos,
  removeRejection,
  reorder: reorderTodos,
};
