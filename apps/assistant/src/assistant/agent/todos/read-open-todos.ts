import { and, asc, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  checklistOfTodo,
  ownTodo,
  todoSource,
} from "#src/assistant/report/own-todo.ts";
import type { DeletedTodo, RejectedTodo, StoredTodo } from "./types.ts";

const DELETED_DAYS = 30;
const MAX_DELETED_TODOS = 100;
const REJECTION_DAYS = 90;
const MAX_REJECTED_TODOS = 50;

/** The user's open to-dos, oldest first. */
export function readOpenTodos(scope: UserScope): Promise<StoredTodo[]> {
  return scope.db
    .select({
      id: todos.id,
      title: todos.title,
      detail: todos.detail,
      dueDate: todos.dueDate,
      startDate: todos.startDate,
      waitingOn: todos.waitingOn,
      followUpDate: todos.followUpDate,
      waitingSince: todos.waitingSince,
      checklist: checklistOfTodo,
      ownerEditedFields: todos.ownerEditedFields,
    })
    .from(todos)
    .where(and(ownTodo(scope), isNull(todos.doneAt)))
    .orderBy(asc(todos.createdAt), asc(todos.title));
}

/** The to-dos the user deleted in the last days and did not reject, newest first. An undone add is not one of them. */
export async function readDeletedTodos(
  { db, userId }: UserScope,
  now: Date,
): Promise<DeletedTodo[]> {
  const rows = await db
    .select({
      id: todos.id,
      title: todos.title,
      sourceAccountId: todos.sourceAccountId,
      sourceMessageId: todos.sourceMessageId,
      deletedAt: todos.deletedAt,
    })
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        isNotNull(todos.deletedAt),
        isNull(todos.rejectedAt),
        isNull(todos.addUndoneAt),
        gt(
          todos.deletedAt,
          new Date(now.getTime() - DELETED_DAYS * 86_400_000),
        ),
      ),
    )
    .orderBy(desc(todos.deletedAt))
    .limit(MAX_DELETED_TODOS);
  return rows.flatMap(({ deletedAt, id, title, ...row }) =>
    deletedAt ? [{ id, title, deletedAt, source: todoSource(row) }] : [],
  );
}

/** The to-dos the user said should not have been added, in the last days, newest first. */
export async function readRejectedTodos(
  { db, userId }: UserScope,
  now: Date,
): Promise<RejectedTodo[]> {
  const rows = await db
    .select({
      id: todos.id,
      title: todos.title,
      note: todos.rejectionNote,
      sourceAccountId: todos.sourceAccountId,
      sourceMessageId: todos.sourceMessageId,
    })
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        gt(
          todos.rejectedAt,
          new Date(now.getTime() - REJECTION_DAYS * 86_400_000),
        ),
      ),
    )
    .orderBy(desc(todos.rejectedAt))
    .limit(MAX_REJECTED_TODOS);
  return rows.map(({ id, title, note, ...row }) => ({
    id,
    title,
    note,
    source: todoSource(row),
  }));
}
