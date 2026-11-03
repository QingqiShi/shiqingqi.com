import type { TodoCreator } from "#src/assistant/db/schema.ts";
import type { TodoView } from "../report/read-report.ts";

/** What the page knows of a to-do. It changes on the page at once, before the server says yes. */
export interface TodoItemData {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  startDate: string | null;
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
    createdBy: todo.createdBy,
    doneAt: todo.doneAt?.toISOString() ?? null,
    doneReason: todo.doneReason,
    reAdded: todo.reAdded,
    openHref: todo.openHref ?? openHref,
  };
}
