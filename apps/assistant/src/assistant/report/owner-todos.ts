import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  addNextOccurrence,
  occurrenceColumns,
  reminderWrite,
  takeBackNextOccurrence,
} from "./add-next-occurrence.ts";
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
import { localClock } from "./due-report-date.ts";
import type { RepeatRule } from "./next-occurrence.ts";
import { liveTodo, ownTodo } from "./own-todo.ts";
import { readReportSettings } from "./read-report-settings.ts";
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
  repeat?: RepeatRule | null;
  /** An ISO time. */
  remindAt?: string | null;
  /** The id of the next occurrence when this closes a repeating to-do. The page makes it, as it does for a new to-do. */
  nextId?: string;
}

/** Why a change of an existing to-do did not happen. */
export type TodoRefusal = "not-found" | "start-after-due" | "id-taken";

/** The fields of `todos` that a change of `OwnerTodoChange` can set. A wait is written on its own. */
const PLAIN_FIELDS = ["title", "detail", "dueDate", "startDate"] as const;

const SNOOZE_MS = 60 * 60 * 1000;

/** The columns of a `remindAt` that a request sent; none when it sent none. */
function sentReminder(remindAt: string | null | undefined, now: Date) {
  return remindAt === undefined
    ? {}
    : reminderWrite(remindAt === null ? null : new Date(remindAt), now);
}

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

/** The fields that a change makes the owner's. A rule decides the dates, so it makes the due date the owner's. */
function fieldsOwnerSets(change: OwnerTodoChange) {
  return PLAIN_FIELDS.filter(
    (field) =>
      change[field] !== undefined || (field === "dueDate" && change.repeat),
  );
}

/** Changes a to-do of the owner's, or says why it did not. */
async function changeTodo(
  scope: UserScope,
  todoId: string,
  change: OwnerTodoChange,
  now: Date,
): Promise<TodoRefusal | null> {
  const { done, nextId, remindAt, ...fieldEdit } = change;
  const edit = { ...fieldEdit, ...sentReminder(remindAt, now) };
  const fields = fieldsOwnerSets(change);
  const timeZone =
    done === true ? (await readReportSettings(scope)).timeZone : null;
  return scope.db.transaction(async (tx) => {
    const row = (
      await tx
        .select({
          ...occurrenceColumns,
          doneAt: todos.doneAt,
          nextTodoId: todos.nextTodoId,
        })
        .from(todos)
        .where(liveTodo(scope, todoId))
        .for("update")
    ).at(0);
    if (!row) return "not-found";
    const { startDate = row.startDate, dueDate = row.dueDate } = edit;
    if (!datesInOrder({ startDate, dueDate })) return "start-after-due";
    if (timeZone !== null && row.doneAt === null) {
      const added = await addNextOccurrence(tx, {
        userId: scope.userId,
        closed: { ...row, ...edit },
        nextId: nextId ?? randomUUID(),
        doneOn: localClock(now, timeZone).date,
        timeZone,
        now,
      });
      if (!added) return "id-taken";
    }
    const series =
      done === false && row.doneAt !== null && row.nextTodoId !== null
        ? {
            ...(await takeBackNextOccurrence(tx, scope, row.nextTodoId)),
            nextTodoId: null,
          }
        : {};
    await tx
      .update(todos)
      .set({
        ...edit,
        ...series,
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

/**
 * Moves an open repeating to-do to other dates of its series, to skip an
 * occurrence or to undo that. The rule moved the dates, not the owner, so
 * `owner_edited_fields` stays as it is. The steps in `ticked` are ticked and the
 * others are not, because each occurrence has its own ticks.
 */
async function moveOccurrence(
  scope: UserScope,
  todoId: string,
  {
    remindAt,
    ticked,
    ...dates
  }: {
    dueDate: string | null;
    startDate: string | null;
    remindAt?: string;
    ticked: readonly string[];
  },
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const moved = await tx
      .update(todos)
      .set({ ...dates, ...sentReminder(remindAt, now), updatedAt: now })
      .where(
        and(
          liveTodo(scope, todoId),
          isNull(todos.doneAt),
          isNotNull(todos.repeat),
        ),
      )
      .returning({ id: todos.id });
    if (moved.length === 0) return false;
    await tx
      .update(todoChecklistItems)
      .set({ done: inArray(todoChecklistItems.id, [...ticked]) })
      .where(
        and(
          eq(todoChecklistItems.userId, scope.userId),
          eq(todoChecklistItems.todoId, todoId),
        ),
      );
    return true;
  });
}

/**
 * Asks for the reminder of an open to-do again in an hour. False when the user
 * has no such to-do, or it has no reminder.
 */
async function snoozeReminder(
  scope: UserScope,
  todoId: string,
  now: Date,
): Promise<boolean> {
  const snoozed = await scope.db
    .update(todos)
    .set({
      snoozedUntil: new Date(now.getTime() + SNOOZE_MS),
      remindedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        liveTodo(scope, todoId),
        isNull(todos.doneAt),
        isNotNull(todos.remindAt),
      ),
    )
    .returning({ id: todos.id });
  return snoozed.length > 0;
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
  moveOccurrence,
  snoozeReminder,
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
