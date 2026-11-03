import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  TODO_EDITABLE_FIELDS,
  todos,
  type TodoEditableField,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { datesInOrder } from "./dates-in-order.ts";
import { ownTodo } from "./own-todo.ts";
import { rearrange } from "./rearrange.ts";

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
export type TodoRefusal = "not-found" | "start-after-due";

/** The date of one to-do, for a change of many in one request. */
export interface DueDateChange {
  id: string;
  dueDate: string | null;
  /** Whether the date counts as the owner's. An undo sets this to what it was. */
  ownerSet: boolean;
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
      ownerEditedFields: TODO_EDITABLE_FIELDS.filter(
        (field) => todo[field] !== null,
      ),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: todos.id })
    .returning({ id: todos.id });
  return added.length > 0;
}

/** Changes a to-do of the owner's, or says why it did not. */
async function changeTodo(
  scope: UserScope,
  todoId: string,
  change: OwnerTodoChange,
  now: Date,
): Promise<TodoRefusal | null> {
  const { done, ...edit } = change;
  const fields = TODO_EDITABLE_FIELDS.filter(
    (field) => change[field] !== undefined,
  );
  return scope.db.transaction(async (tx) => {
    const row = (
      await tx
        .select({ startDate: todos.startDate, dueDate: todos.dueDate })
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
    .set({ deletedAt: null, updatedAt: now })
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
  const rows = sql.join(
    changes.map(
      ({ id, dueDate, ownerSet }) =>
        sql`(${id}::uuid, ${dueDate}::date, ${ownerSet}::boolean)`,
    ),
    sql`, `,
  );
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
    const startOf = new Map(earlier.map((row) => [row.id, row.startDate]));
    const outOfOrder = changes.some(
      ({ id, dueDate }) =>
        !datesInOrder({ startDate: startOf.get(id) ?? null, dueDate }),
    );
    if (outOfOrder) return "start-after-due";
    await tx
      .update(todos)
      .set({
        dueDate: sql`changed.due_date`,
        ownerEditedFields: sql`case when changed.owner_set
          then ${withOwnerFields(["dueDate"])}
          else array_remove(${todos.ownerEditedFields}, 'dueDate') end`,
        updatedAt: now,
      })
      .from(sql`(values ${rows}) as changed(id, due_date, owner_set)`)
      .where(and(ownTodo(scope), sql`${todos.id} = changed.id`));
    return earlier.map(({ id, dueDate, ownerEditedFields }) => ({
      id,
      dueDate,
      ownerSet: ownerEditedFields.includes("dueDate"),
    }));
  });
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
    // A row that waited for its lock can have a new position, and the order of
    // the query does not show this. Thus sort after the lock.
    const byPosition = rows.toSorted((a, b) => a.position - b.position);
    const places = rearrange(byPosition, ids).map(
      ({ id }, index) =>
        sql`(${id}::uuid, ${byPosition[index].position}::integer)`,
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
  delete: deleteTodo,
  restore: restoreTodo,
  changeDueDates,
  reorder: reorderTodos,
};
