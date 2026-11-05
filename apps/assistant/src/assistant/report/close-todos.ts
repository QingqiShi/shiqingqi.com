import { randomUUID } from "node:crypto";
import {
  and,
  eq,
  inArray,
  isNotNull,
  TransactionRollbackError,
} from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
import {
  addNextOccurrence,
  occurrenceColumns,
  takeBackNextOccurrence,
} from "./add-next-occurrence.ts";
import { localClock } from "./due-report-date.ts";
import { liveTodo, ownTodo } from "./own-todo.ts";
import type { TodoRefusal } from "./owner-todos.ts";
import { readReportSettings } from "./read-report-settings.ts";

/** A to-do that comes back no longer teaches the report anything. */
export const notDeleted = {
  deletedAt: null,
  rejectedAt: null,
  rejectionNote: null,
  addUndoneAt: null,
};

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
export async function closeTodos(
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
export async function reopenTodos(
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
export async function deleteTodos(
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
export async function restoreTodos(
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
export async function rejectTodos(
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
