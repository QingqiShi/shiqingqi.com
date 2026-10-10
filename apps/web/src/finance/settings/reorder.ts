/**
 * The `{ id, position }` changes that move `id` one place up (`-1`) or down
 * (`1`) in `rows`, numbering every row by its new index. Rows whose
 * position already matches are left out.
 */
export function reorder(
  rows: readonly { id: string; position: number }[],
  id: string,
  direction: -1 | 1,
): { id: string; position: number }[] {
  const index = rows.findIndex((row) => row.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return [];
  const order = rows.map((row) => row.id);
  [order[index], order[target]] = [order[target], order[index]];
  const positionOf = new Map(rows.map((row) => [row.id, row.position]));
  return order
    .map((rowId, position) => ({ id: rowId, position }))
    .filter((change) => positionOf.get(change.id) !== change.position);
}
