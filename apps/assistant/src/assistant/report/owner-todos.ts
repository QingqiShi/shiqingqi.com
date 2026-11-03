import { randomUUID } from "node:crypto";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  TransactionRollbackError,
} from "drizzle-orm";
import {
  todoChecklistItems,
  todos,
  type TodoEditableField,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import {
  addNextOccurrence,
  occurrenceColumns,
  reminderWrite,
} from "./add-next-occurrence.ts";
import { datesInOrder } from "./dates-in-order.ts";
import { localClock } from "./due-report-date.ts";
import type { RepeatRule } from "./next-occurrence.ts";
import { ownTodo } from "./own-todo.ts";
import { readReportSettings } from "./read-report-settings.ts";
import { placesInOrder } from "./rearrange.ts";

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

/** What a to-do waits on, as the owner writes it. No `waitingOn` means that it does not wait. */
export interface WaitingChange {
  waitingOn: string | null;
  followUpDate: string | null;
}

/** All of what a to-do's wait was, for an undo. */
export interface EarlierWaiting extends WaitingChange {
  /** An ISO time. */
  waitingSince: string | null;
  waitingNote: string | null;
  ownerSet: { waitingOn: boolean; followUpDate: boolean };
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

/** The date of one to-do, for a change of many in one request. */
export interface DueDateChange {
  id: string;
  dueDate: string | null;
  /** Whether the date counts as the owner's. An undo sets this to what it was. */
  ownerSet: boolean;
  /** A new start date, for a due date that would come before the one the to-do has. */
  start?: { date: string | null; ownerSet: boolean };
}

/** `owner_edited_fields` with these fields added. */
function withOwnerFields(fields: readonly TodoEditableField[]) {
  const names = sql.join(
    fields.map((field) => sql`${field}`),
    sql`, `,
  );
  return sql<
    TodoEditableField[]
  >`array(select distinct unnest(${todos.ownerEditedFields} || array[${names}]::text[]))`;
}

function liveTodo(scope: UserScope, todoId: string) {
  return and(ownTodo(scope), eq(todos.id, todoId));
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

/**
 * Opens a closed occurrence again. When its next occurrence is still open, the
 * row goes, with no trace for the agent, because the owner did not delete it, and
 * this one takes its place. When the series has moved on or ended, this one stays
 * as a to-do that does not repeat, so that the series does not run twice.
 */
async function takeBackNextOccurrence(
  tx: Pick<AssistantDb, "select" | "delete">,
  scope: UserScope,
  nextId: string,
) {
  const next = (
    await tx
      .select({
        position: todos.position,
        doneAt: todos.doneAt,
        deletedAt: todos.deletedAt,
      })
      .from(todos)
      .where(and(eq(todos.userId, scope.userId), eq(todos.id, nextId)))
      .for("update")
  ).at(0);
  if (!next || next.doneAt || next.deletedAt) return { repeat: null };
  await tx
    .delete(todos)
    .where(and(eq(todos.userId, scope.userId), eq(todos.id, nextId)));
  return { position: next.position };
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

/** Locks an open to-do and reads its wait. */
function lockWaiting(
  tx: Pick<AssistantDb, "select">,
  scope: UserScope,
  todoId: string,
) {
  return tx
    .select({
      waitingOn: todos.waitingOn,
      followUpDate: todos.followUpDate,
      waitingSince: todos.waitingSince,
      waitingNote: todos.waitingNote,
      ownerEditedFields: todos.ownerEditedFields,
    })
    .from(todos)
    .where(and(liveTodo(scope, todoId), isNull(todos.doneAt)))
    .for("update");
}

/**
 * Makes an open to-do wait, changes its wait or ends it, and gives back what the
 * wait was, for an undo. A new `waitingOn` is a new wait, so it starts now, and
 * what the agent said about the last one goes. Null when the user has no such
 * to-do. What changes becomes the owner's.
 */
async function changeWaiting(
  scope: UserScope,
  todoId: string,
  { waitingOn, followUpDate }: WaitingChange,
  now: Date,
): Promise<EarlierWaiting | null> {
  return scope.db.transaction(async (tx) => {
    const row = (await lockWaiting(tx, scope, todoId)).at(0);
    if (!row) return null;
    const sameWait = row.waitingOn === waitingOn;
    const nextFollowUp = waitingOn === null ? null : followUpDate;
    const fields = [
      ...(sameWait ? [] : ["waitingOn" as const]),
      ...(row.followUpDate === nextFollowUp ? [] : ["followUpDate" as const]),
    ];
    if (fields.length > 0) {
      await tx
        .update(todos)
        .set({
          waitingOn,
          followUpDate: nextFollowUp,
          ...(sameWait
            ? {}
            : {
                waitingSince: waitingOn === null ? null : now,
                waitingNote: null,
              }),
          ownerEditedFields: withOwnerFields(fields),
          updatedAt: now,
        })
        .where(liveTodo(scope, todoId));
    }
    return {
      waitingOn: row.waitingOn,
      followUpDate: row.followUpDate,
      waitingSince: row.waitingSince?.toISOString() ?? null,
      waitingNote: row.waitingNote,
      ownerSet: {
        waitingOn: row.ownerEditedFields.includes("waitingOn"),
        followUpDate: row.ownerEditedFields.includes("followUpDate"),
      },
    };
  });
}

/** Puts a wait back as `changeWaiting` gave it. False when the user has no such to-do. */
async function restoreWaiting(
  scope: UserScope,
  todoId: string,
  { ownerSet, waitingSince, ...wait }: EarlierWaiting,
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const row = (await lockWaiting(tx, scope, todoId)).at(0);
    if (!row) return false;
    const owned = withOwnerField(
      row.ownerEditedFields,
      "waitingOn",
      ownerSet.waitingOn,
    );
    await tx
      .update(todos)
      .set({
        ...wait,
        waitingSince: waitingSince === null ? null : new Date(waitingSince),
        ownerEditedFields: withOwnerField(
          owned,
          "followUpDate",
          ownerSet.followUpDate,
        ),
        updatedAt: now,
      })
      .where(liveTodo(scope, todoId));
    return true;
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

/** A to-do that comes back no longer teaches the report anything. */
const notDeleted = { deletedAt: null, rejectedAt: null, rejectionNote: null };

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

/** The fields with this one in them or out of them. */
function withOwnerField(
  fields: readonly TodoEditableField[],
  field: TodoEditableField,
  ownerSet: boolean,
) {
  const others = fields.filter((other) => other !== field);
  return ownerSet ? [...others, field] : others;
}

function textArray(values: readonly string[]) {
  const items = values.map((value) => sql`${value}`);
  return sql`array[${sql.join(items, sql`, `)}]::text[]`;
}

/**
 * Sets the due dates of many to-dos in one transaction, and gives back what
 * they were, for an undo. Nothing changes when the user lacks one of them or
 * one would start after its new date.
 */
async function changeDueDates(
  scope: UserScope,
  changes: readonly DueDateChange[],
  now: Date,
): Promise<DueDateChange[] | TodoRefusal> {
  const ids = [...new Set(changes.map((change) => change.id))];
  if (ids.length !== changes.length) return "not-found";
  const changeOf = new Map(changes.map((change) => [change.id, change]));
  return scope.db.transaction(async (tx) => {
    const earlier = await tx
      .select({
        id: todos.id,
        dueDate: todos.dueDate,
        startDate: todos.startDate,
        ownerEditedFields: todos.ownerEditedFields,
      })
      .from(todos)
      .where(and(ownTodo(scope), inArray(todos.id, ids)))
      .for("update");
    if (earlier.length !== ids.length) return "not-found";
    const writes = earlier.flatMap((row) => {
      const change = changeOf.get(row.id);
      return change ? [{ row, change }] : [];
    });
    const startOf = ({ row, change }: (typeof writes)[number]) =>
      change.start ? change.start.date : row.startDate;
    const outOfOrder = writes.some(
      (write) =>
        !datesInOrder({
          startDate: startOf(write),
          dueDate: write.change.dueDate,
        }),
    );
    if (outOfOrder) return "start-after-due";
    const rows = writes.map((write) => {
      const { row, change } = write;
      const owned = withOwnerField(
        row.ownerEditedFields,
        "dueDate",
        change.ownerSet,
      );
      const fields = change.start
        ? withOwnerField(owned, "startDate", change.start.ownerSet)
        : owned;
      return sql`(${row.id}::uuid, ${change.dueDate}::date, ${startOf(write)}::date, ${textArray(fields)})`;
    });
    await tx
      .update(todos)
      .set({
        dueDate: sql`changed.due_date`,
        startDate: sql`changed.start_date`,
        ownerEditedFields: sql`changed.fields`,
        updatedAt: now,
      })
      .from(
        sql`(values ${sql.join(rows, sql`, `)}) as changed(id, due_date, start_date, fields)`,
      )
      .where(and(ownTodo(scope), sql`${todos.id} = changed.id`));
    return writes.map(({ row, change }) => ({
      id: row.id,
      dueDate: row.dueDate,
      ownerSet: row.ownerEditedFields.includes("dueDate"),
      ...(change.start
        ? {
            start: {
              date: row.startDate,
              ownerSet: row.ownerEditedFields.includes("startDate"),
            },
          }
        : {}),
    }));
  });
}

/** Locks these to-dos for the transaction. */
function lockTodos(
  tx: Pick<AssistantDb, "select">,
  scope: UserScope,
  ids: readonly string[],
) {
  return tx
    .select({
      ...occurrenceColumns,
      doneAt: todos.doneAt,
      nextTodoId: todos.nextTodoId,
    })
    .from(todos)
    .where(and(ownTodo(scope), inArray(todos.id, [...ids])))
    .for("update");
}

/**
 * Closes many to-dos, all or none, and makes the next occurrence of each one
 * that repeats. It gives back those that it closed, because one that is done
 * already must stay done after an undo.
 */
async function closeTodos(
  scope: UserScope,
  closing: readonly { id: string; nextId?: string }[],
  now: Date,
): Promise<string[] | TodoRefusal> {
  const { timeZone } = await readReportSettings(scope);
  const nextIdOf = new Map(closing.map(({ id, nextId }) => [id, nextId]));
  try {
    return await scope.db.transaction(async (tx) => {
      const rows = await lockTodos(tx, scope, [...nextIdOf.keys()]);
      if (rows.length !== closing.length) return "not-found";
      const open = rows.filter((row) => row.doneAt === null);
      for (const row of open) {
        const added = await addNextOccurrence(tx, {
          userId: scope.userId,
          closed: row,
          nextId: nextIdOf.get(row.id) ?? randomUUID(),
          doneOn: localClock(now, timeZone).date,
          timeZone,
          now,
        });
        if (!added) tx.rollback();
      }
      const closed = open.map((row) => row.id);
      await tx
        .update(todos)
        .set({ doneAt: now, updatedAt: now })
        .where(and(ownTodo(scope), inArray(todos.id, closed)));
      return closed;
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return "id-taken";
    throw error;
  }
}

/** Opens many to-dos again, all or none, each as `changeTodo` does. False when the user lacks one of them. */
async function reopenTodos(
  scope: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const rows = await lockTodos(tx, scope, ids);
    if (rows.length !== ids.length) return false;
    const closed = rows.filter((row) => row.doneAt !== null);
    for (const { id, nextTodoId } of closed) {
      if (nextTodoId === null) continue;
      await tx
        .update(todos)
        .set(await takeBackNextOccurrence(tx, scope, nextTodoId))
        .where(liveTodo(scope, id));
    }
    await tx
      .update(todos)
      .set({ doneAt: null, doneReason: null, nextTodoId: null, updatedAt: now })
      .where(
        and(
          ownTodo(scope),
          inArray(
            todos.id,
            closed.map((row) => row.id),
          ),
        ),
      );
    return true;
  });
}

/** Hides many to-dos, all or none. False when the user lacks one of them. */
async function deleteTodos(
  scope: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<boolean> {
  return scope.db.transaction(async (tx) => {
    const rows = await lockTodos(tx, scope, ids);
    if (rows.length !== ids.length) return false;
    await tx
      .update(todos)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(ownTodo(scope), inArray(todos.id, [...ids])));
    return true;
  });
}

/** Brings many deleted to-dos back. False when the user has none of them. */
async function restoreTodos(
  { db, userId }: UserScope,
  ids: readonly string[],
  now: Date,
): Promise<boolean> {
  const restored = await db
    .update(todos)
    .set({ ...notDeleted, updatedAt: now })
    .where(
      and(
        eq(todos.userId, userId),
        inArray(todos.id, [...ids]),
        isNotNull(todos.deletedAt),
      ),
    )
    .returning({ id: todos.id });
  return restored.length > 0;
}

/**
 * Says that the report should not have added these deleted to-dos, all or none.
 * False when one of them is not a deleted to-do of the report's.
 */
async function rejectTodos(
  { db, userId }: UserScope,
  ids: readonly string[],
  note: string | null,
  now: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const rejectable = and(
      eq(todos.userId, userId),
      inArray(todos.id, [...ids]),
      isNotNull(todos.deletedAt),
      eq(todos.createdBy, "report"),
    );
    const rows = await tx
      .select({ id: todos.id })
      .from(todos)
      .where(rejectable)
      .for("update");
    if (rows.length !== ids.length) return false;
    await tx
      .update(todos)
      .set({ rejectedAt: now, rejectionNote: note, updatedAt: now })
      .where(rejectable);
    return true;
  });
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
