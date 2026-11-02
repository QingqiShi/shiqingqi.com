import { and, eq, sql } from "drizzle-orm";
import { todoChecklistItems, todos } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  nextOccurrenceDates,
  nextOccurrenceReminder,
} from "./next-occurrence.ts";

/** What a closed to-do gives its next occurrence. */
export const occurrenceColumns = {
  id: todos.id,
  title: todos.title,
  detail: todos.detail,
  dueDate: todos.dueDate,
  startDate: todos.startDate,
  repeat: todos.repeat,
  remindAt: todos.remindAt,
  position: todos.position,
  ownerEditedFields: todos.ownerEditedFields,
};

type ClosedTodo = Pick<
  typeof todos.$inferSelect,
  keyof typeof occurrenceColumns
>;

/**
 * The columns of a reminder that is set or moved. A time that has passed counts
 * as sent, because a reminder that a repeat or an undo moved must not fire at once.
 */
export function reminderWrite(remindAt: Date | null, now: Date) {
  return {
    remindAt,
    snoozedUntil: null,
    remindedAt: remindAt !== null && remindAt <= now ? now : null,
  };
}

/**
 * Makes the next occurrence of a repeating to-do that this transaction closes,
 * and links the two. The new row takes over the place in the owner's order. The
 * mail stays with the occurrence that it was about, and the checklist comes along
 * with no ticks. False when `nextId` is taken, and nothing has changed then. A
 * to-do that does not repeat needs nothing.
 */
export async function addNextOccurrence(
  tx: Pick<AssistantDb, "insert" | "select" | "update">,
  {
    userId,
    closed,
    nextId,
    doneOn,
    timeZone,
    now,
  }: {
    userId: string;
    closed: ClosedTodo;
    nextId: string;
    doneOn: string;
    timeZone: string;
    now: Date;
  },
): Promise<boolean> {
  if (!closed.repeat) return true;
  const dates = nextOccurrenceDates(closed.repeat, closed, doneOn);
  const added = await tx
    .insert(todos)
    .values({
      id: nextId,
      userId,
      title: closed.title,
      detail: closed.detail,
      ...dates,
      ...reminderWrite(
        closed.remindAt &&
          nextOccurrenceReminder(closed.remindAt, {
            dueDate: closed.dueDate,
            nextDueDate: dates.dueDate,
            timeZone,
          }),
        now,
      ),
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
