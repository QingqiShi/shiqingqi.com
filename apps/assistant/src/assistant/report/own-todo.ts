import { and, eq, isNull, sql } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import type { MailSource } from "./types.ts";

/** The user's to-dos that are not deleted. */
export function ownTodo({ userId }: Pick<UserScope, "userId">) {
  return and(eq(todos.userId, userId), isNull(todos.deletedAt));
}

/** One step of a to-do's checklist. */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * A column for a select from `todos`: the to-do's checklist, in the owner's order.
 * Drizzle removes the table name from a column in a select of one table, and then
 * the name refers to the inner table. Thus the names are plain text here.
 */
export const checklistOfTodo = sql<ChecklistItem[]>`coalesce((
  select jsonb_agg(
    jsonb_build_object('id', item.id, 'text', item.text, 'done', item.done)
    order by item.position
  )
  from todo_checklist_items item
  where item.todo_id = "todos"."id" and item.user_id = "todos"."user_id"
), '[]'::jsonb)`;

/** The mail that a to-do came from. */
export function todoSource(row: {
  sourceAccountId: string | null;
  sourceMessageId: string | null;
}): MailSource | null {
  return row.sourceAccountId && row.sourceMessageId
    ? { accountId: row.sourceAccountId, messageId: row.sourceMessageId }
    : null;
}
