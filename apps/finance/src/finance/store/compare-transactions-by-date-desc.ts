import type { TransactionRow } from "../sync/row-schemas.ts";

type Sortable = Pick<TransactionRow, "date" | "createdAt" | "id">;

/** Newest day first; within a day the newest created first; the id breaks ties so the order is total. */
export function compareTransactionsByDateDesc(a: Sortable, b: Sortable) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}
