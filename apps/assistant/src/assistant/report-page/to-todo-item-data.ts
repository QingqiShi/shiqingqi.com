import type { TodoCreator } from "#src/assistant/db/schema.ts";
import type { RepeatRule } from "../report/next-occurrence.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import type { TodoView } from "../report/read-report.ts";

/** The ISO times that a to-do holds on the calendar. */
export interface CalendarSlot {
  start: string;
  end: string;
}

/** What the page knows of a to-do. It changes on the page at once, before the server says yes. */
export interface TodoItemData {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
  repeat: RepeatRule | null;
  calendarSlot: CalendarSlot | null;
  /** The occurrence that closing this one made. */
  nextId: string | null;
  /** Who or what it waits on. */
  waitingOn: string | null;
  followUpDate: string | null;
  /** Why the report agent made it wait or ended the wait. */
  waitingNote: string | null;
  checklist: readonly ChecklistItem[];
  createdBy: TodoCreator;
  /** ISO time; null while open. */
  doneAt: string | null;
  doneReason: string | null;
  reAdded: boolean;
  openHref: string | null;
}

export function isOpen(row: TodoItemData) {
  return row.doneAt === null;
}

/** True for a slot that begins after this time, in milliseconds. */
export function slotIsAhead(slot: CalendarSlot | null, after: number) {
  return slot !== null && Date.parse(slot.start) > after;
}

/** What a row shows of a to-do; `openHref` stands in when the to-do names no mail. */
export function toTodoItemData(
  todo: TodoView,
  openHref: string | null = null,
): TodoItemData {
  return {
    id: todo.id,
    title: todo.title,
    detail: todo.detail,
    dueDate: todo.dueDate,
    startDate: todo.startDate,
    repeat: todo.repeat,
    calendarSlot: todo.calendarSlot && {
      start: todo.calendarSlot.start.toISOString(),
      end: todo.calendarSlot.end.toISOString(),
    },
    nextId: todo.nextId,
    waitingOn: todo.waitingOn,
    followUpDate: todo.followUpDate,
    waitingNote: todo.waitingNote,
    checklist: todo.checklist,
    createdBy: todo.createdBy,
    doneAt: todo.doneAt?.toISOString() ?? null,
    doneReason: todo.doneReason,
    reAdded: todo.reAdded,
    openHref: todo.openHref ?? openHref,
  };
}
