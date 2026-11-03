import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  TODO_EDITABLE_FIELDS,
  todos,
  type TodoEditableField,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { ownTodo } from "./own-todo.ts";

interface NewOwnerTodo {
  /** Made by the page, so that it can show the row and change it before the row is stored. */
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
}

export interface OwnerTodoChange {
  done?: boolean;
  title?: string;
  detail?: string | null;
  dueDate?: string | null;
}

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

/** Changes a to-do of the owner's. False when the user has no such to-do. */
async function changeTodo(
  scope: UserScope,
  todoId: string,
  change: OwnerTodoChange,
  now: Date,
): Promise<boolean> {
  const { done, ...edit } = change;
  const fields = TODO_EDITABLE_FIELDS.filter(
    (field) => change[field] !== undefined,
  );
  const updated = await scope.db
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
    .where(liveTodo(scope, todoId))
    .returning({ id: todos.id });
  return updated.length > 0;
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
 * they were, for an undo. Null, and nothing changes, when the user lacks one
 * of them.
 */
async function changeDueDates(
  scope: UserScope,
  changes: readonly DueDateChange[],
  now: Date,
): Promise<DueDateChange[] | null> {
  const ids = [...new Set(changes.map((change) => change.id))];
  if (ids.length !== changes.length) return null;
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
        ownerEditedFields: todos.ownerEditedFields,
      })
      .from(todos)
      .where(and(ownTodo(scope), inArray(todos.id, ids)))
      .for("update");
    if (earlier.length !== ids.length) return null;
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

/** What the owner can write in their to-dos. Each takes the user from the session. */
export const ownerTodos = {
  add: addTodo,
  change: changeTodo,
  delete: deleteTodo,
  restore: restoreTodo,
  changeDueDates,
};
