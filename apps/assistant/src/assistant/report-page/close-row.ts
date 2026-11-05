import type { RepeatRule } from "../report/next-occurrence.ts";
import {
  nextOccurrenceDates,
  nextOccurrenceReminder,
} from "../report/next-occurrence.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import type { TodoOp } from "./patch-row.ts";
import { isOpen, slotIsAhead, type TodoItemData } from "./to-todo-item-data.ts";

export function withTicks(
  steps: readonly ChecklistItem[],
  ticked: readonly string[],
): readonly ChecklistItem[] {
  return steps.map((step) => ({ ...step, done: ticked.includes(step.id) }));
}

/** Closes a to-do, and adds its next occurrence where the row was, as the server does. */
export function closeRow(
  id: string,
  next: TodoItemData | null,
  doneAt: string,
): TodoOp {
  return (rows) => {
    const shown = rows.some((row) => row.id === next?.id);
    return rows.flatMap((row) => {
      if (row.id !== id) return [row];
      const closed = {
        ...row,
        doneAt,
        nextId: next?.id ?? row.nextId,
        calendarSlot: slotIsAhead(row.calendarSlot, Date.parse(doneAt))
          ? null
          : row.calendarSlot,
      };
      return next && !shown ? [next, closed] : [closed];
    });
  };
}

/**
 * Opens a to-do again, as the server does: it takes the place of its next
 * occurrence that is still open, and it does not repeat when that one is done.
 * A next occurrence that this page does not hold says nothing. It also takes
 * the time that its next occurrence held on the calendar.
 */
export function reopenRow(id: string): TodoOp {
  return (rows) => {
    const row = rows.find((entry) => entry.id === id);
    if (!row) return rows;
    const next = rows.find((entry) => entry.id === row.nextId);
    const reopened = { ...row, doneAt: null, doneReason: null, nextId: null };
    return next && isOpen(next)
      ? rows
          .filter((entry) => entry.id !== id)
          .map((entry) =>
            entry.id === next.id
              ? {
                  ...reopened,
                  calendarSlot: next.calendarSlot ?? row.calendarSlot,
                }
              : entry,
          )
      : rows.map((entry) =>
          entry.id === id
            ? { ...reopened, repeat: next ? null : row.repeat }
            : entry,
        );
  };
}

/** The reminder of a row after a change of its time. A time that has passed goes out no more, as on the server. */
export function reminderFields(remindAt: string | null) {
  return {
    remindAt,
    nextReminderAt:
      remindAt !== null && Date.parse(remindAt) > Date.now() ? remindAt : null,
  };
}

/** The dates and the reminder of the occurrence after this one. */
export function nextOccurrenceFields(
  row: TodoItemData,
  rule: RepeatRule,
  today: string,
  timeZone: string,
) {
  const dates = nextOccurrenceDates(rule, row, today);
  return {
    ...dates,
    ...reminderFields(
      row.remindAt &&
        nextOccurrenceReminder(new Date(row.remindAt), {
          dueDate: row.dueDate,
          nextDueDate: dates.dueDate,
          timeZone,
        }).toISOString(),
    ),
  };
}

export function nextRowOf(
  row: TodoItemData,
  today: string,
  timeZone: string,
): (TodoItemData & { dueDate: string }) | null {
  return row.repeat && isOpen(row)
    ? {
        ...row,
        ...nextOccurrenceFields(row, row.repeat, today, timeZone),
        id: crypto.randomUUID(),
        calendarSlot: null,
        checklist: withTicks(row.checklist, []),
        waitingOn: null,
        followUpDate: null,
        waitingNote: null,
        createdBy: "owner" as const,
        reAdded: false,
        openHref: null,
      }
    : null;
}
