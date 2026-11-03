import { and, eq, sql } from "drizzle-orm";
import { todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { nextOccurrenceDates } from "./next-occurrence.ts";

/** What a closed to-do gives its next occurrence. */
export const occurrenceColumns = {
  id: todos.id,
  title: todos.title,
  detail: todos.detail,
  dueDate: todos.dueDate,
  startDate: todos.startDate,
  repeat: todos.repeat,
  position: todos.position,
  ownerEditedFields: todos.ownerEditedFields,
};

type ClosedTodo = Pick<
  typeof todos.$inferSelect,
  keyof typeof occurrenceColumns
>;

/**
 * Makes the next occurrence of a repeating to-do that this transaction closes,
 * and links the two. The new row takes over the place in the owner's order. The
 * mail stays with the occurrence that it was about. False when `nextId` is taken,
 * and nothing has changed then. A to-do that does not repeat needs nothing.
 */
export async function addNextOccurrence(
  tx: Pick<AssistantDb, "insert" | "update">,
  {
    userId,
    closed,
    nextId,
    doneOn,
    now,
  }: {
    userId: string;
    closed: ClosedTodo;
    nextId: string;
    doneOn: string;
    now: Date;
  },
): Promise<boolean> {
  if (!closed.repeat) return true;
  const added = await tx
    .insert(todos)
    .values({
      id: nextId,
      userId,
      title: closed.title,
      detail: closed.detail,
      ...nextOccurrenceDates(closed.repeat, closed, doneOn),
      repeat: closed.repeat,
      position: closed.position,
      createdBy: "owner",
      ownerEditedFields: closed.ownerEditedFields,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: todos.id })
    .returning({ id: todos.id });
  if (added.length === 0) return false;
  await tx
    .update(todos)
    .set({
      nextTodoId: nextId,
      position: sql`nextval(pg_get_serial_sequence('todos', 'position'))`,
    })
    .where(and(eq(todos.userId, userId), eq(todos.id, closed.id)));
  return true;
}
