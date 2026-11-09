import type { TodoOp } from "./patch-row.ts";
import { slotIsAhead } from "./to-todo-item-data.ts";

export function closeRow(id: string, doneAt: string): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === id
        ? {
            ...row,
            doneAt,
            calendarSlot: slotIsAhead(row.calendarSlot, Date.parse(doneAt))
              ? null
              : row.calendarSlot,
          }
        : row,
    );
}

export function reopenRow(id: string): TodoOp {
  return (rows) =>
    rows.map((row) =>
      row.id === id ? { ...row, doneAt: null, doneReason: null } : row,
    );
}
