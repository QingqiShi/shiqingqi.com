import type { CategoryRow, TransactionRow } from "../sync/row-schemas.ts";

const OVERALL_WINDOW = 1000;

interface TopCategoriesInput {
  kind: "expense" | "income";
  /** The chosen Payee's Transactions, newest first; empty for no Payee. */
  payeeHistory: readonly TransactionRow[];
  /** Every Transaction, newest first. */
  recent: readonly TransactionRow[];
  /** Live Categories that may be picked. */
  categories: readonly Pick<CategoryRow, "id" | "kind">[];
  limit?: number;
}

function countCategories(
  rows: readonly TransactionRow[],
  kind: string,
  allowed: ReadonlySet<string>,
  max: number,
) {
  const counts = new Map<string, number>();
  let seen = 0;
  for (const row of rows) {
    if (seen >= max) break;
    if (row.kind !== kind || row.categoryId === null) continue;
    seen++;
    if (!allowed.has(row.categoryId)) continue;
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/**
 * The Category chips the editor shows first: the ones this Payee used most,
 * then the ones used most overall in recent Transactions, then the rest in
 * tree order, up to `limit`.
 */
export function topCategories(input: TopCategoriesInput): string[] {
  const limit = input.limit ?? 8;
  const allowed = new Set(
    input.categories
      .filter((category) => category.kind === input.kind)
      .map((category) => category.id),
  );
  const result = new Set<string>();
  const add = (ids: Iterable<string>) => {
    for (const id of ids) {
      if (result.size >= limit) return;
      result.add(id);
    }
  };
  add(countCategories(input.payeeHistory, input.kind, allowed, OVERALL_WINDOW));
  add(countCategories(input.recent, input.kind, allowed, OVERALL_WINDOW));
  add(allowed);
  return [...result];
}
