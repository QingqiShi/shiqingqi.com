import type { WaitingChange } from "../report/change-waiting.ts";
import type { ChecklistItem } from "../report/own-todo.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";

export type TodoRows = readonly TodoItemData[];

/** One change of the list. It runs again on newer rows, so it must not depend on where it first ran. */
export type TodoOp = (rows: TodoRows) => TodoRows;

export function patchRow(id: string, patch: Partial<TodoItemData>): TodoOp {
  return (rows) =>
    rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function patchChecklist(
  todoId: string,
  change: (steps: readonly ChecklistItem[]) => readonly ChecklistItem[],
): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === todoId ? { ...row, checklist: change(row.checklist) } : row,
    );
}

export function withDueDates(
  changes: readonly (Pick<TodoItemData, "id" | "dueDate"> &
    Partial<Pick<TodoItemData, "startDate">>)[],
): TodoOp {
  const dates = new Map(
    changes.map(({ id, dueDate, startDate }) => [
      id,
      startDate === undefined ? { dueDate } : { dueDate, startDate },
    ]),
  );
  return (rows) => rows.map((row) => ({ ...row, ...dates.get(row.id) }));
}

/** A wait after a change, as the server writes it. A new wait has nothing yet from the agent. */
export function withWaiting(id: string, change: WaitingChange): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === id
        ? {
            ...row,
            ...change,
            waitingNote:
              row.waitingOn === change.waitingOn ? row.waitingNote : null,
          }
        : row,
    );
}

export function inOrder(ops: readonly TodoOp[]): TodoOp {
  return (rows) => ops.reduce((list, op) => op(list), rows);
}
