import { and, eq, sql } from "drizzle-orm";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
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
 * mail and the wait stay with the occurrence that they were about, and the
 * checklist comes along with no ticks. False when `nextId` is taken, and nothing has changed then. A
 * to-do that does not repeat needs nothing.
 */
export async function addNextOccurrence(
  tx: Pick<AssistantDb, "insert" | "select" | "update">,
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
      ownerEditedFields: closed.ownerEditedFields.filter(
        (field) => field !== "waitingOn" && field !== "followUpDate",
      ),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: todos.id })
    .returning({ id: todos.id });
  if (added.length === 0) return false;
  const steps = await tx
    .select({
      id: todoChecklistItems.id,
      text: todoChecklistItems.text,
      position: todoChecklistItems.position,
    })
    .from(todoChecklistItems)
    .where(
      and(
        eq(todoChecklistItems.userId, userId),
        eq(todoChecklistItems.todoId, closed.id),
      ),
    );
  if (steps.length > 0) {
    await tx
      .insert(todoChecklistItems)
      .values(steps.map((step) => ({ ...step, userId, todoId: nextId })));
  }
  await tx
    .update(todos)
    .set({
      nextTodoId: nextId,
      position: sql`nextval(pg_get_serial_sequence('todos', 'position'))`,
    })
    .where(and(eq(todos.userId, userId), eq(todos.id, closed.id)));
  return true;
}

/**
 * Opens the way for a closed occurrence to open again. When its next occurrence is
 * still open, the row goes, with no trace for the agent, because the owner did not
 * delete it, and this one takes its place, with the time that it held on the
 * calendar, so that its event does not stay with no to-do. When the series has moved on or ended,
 * this one stays as a to-do that does not repeat, so that the series does not run
 * twice. It gives the columns to write on the row that opens.
 */
export async function takeBackNextOccurrence(
  tx: Pick<AssistantDb, "select" | "delete">,
  { userId }: Pick<UserScope, "userId">,
  nextId: string,
) {
  const next = (
    await tx
      .select({
        position: todos.position,
        doneAt: todos.doneAt,
        deletedAt: todos.deletedAt,
        calendarAccountId: todos.calendarAccountId,
        calendarUrl: todos.calendarUrl,
        calendarHref: todos.calendarHref,
        calendarEtag: todos.calendarEtag,
        calendarStart: todos.calendarStart,
        calendarEnd: todos.calendarEnd,
      })
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.id, nextId)))
      .for("update")
  ).at(0);
  if (!next || next.doneAt || next.deletedAt) return { repeat: null };
  await tx
    .delete(todos)
    .where(and(eq(todos.userId, userId), eq(todos.id, nextId)));
  const { position, doneAt: _, deletedAt: __, ...slot } = next;
  return { position, ...(slot.calendarAccountId ? slot : {}) };
}
