import type { LocalMutationInput } from "../replica/create-replica-store.ts";

/** `ids` with `id` taken out and put back where `targetId` is. */
export function moveTo(
  ids: readonly string[],
  id: string,
  targetId: string,
): string[] {
  const from = ids.indexOf(id);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) return [...ids];
  const order = [...ids];
  order.splice(from, 1);
  order.splice(to, 0, id);
  return order;
}

/** `ids` with `id` one place up (`-1`) or down (`1`); unchanged at an end. */
export function moveBy(
  ids: readonly string[],
  id: string,
  direction: -1 | 1,
): string[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  return index < 0 || target < 0 || target >= ids.length
    ? [...ids]
    : moveTo(ids, id, ids[target]);
}

/**
 * The `{ id, position }` changes that put `rows` in the order of `order`,
 * numbering every row by its new index. `rows` must be in position order.
 * When `order` holds only some of the rows, they share the slots they had
 * and the others stay where they are. Rows whose position already matches
 * are left out.
 */
export function reorder(
  rows: readonly { id: string; position: number }[],
  order: readonly string[],
): { id: string; position: number }[] {
  const moved = new Set(order);
  const positionOf = new Map(rows.map((row) => [row.id, row.position]));
  let next = 0;
  return rows
    .map((row, position) => ({
      id: moved.has(row.id) ? (order[next++] ?? row.id) : row.id,
      position,
    }))
    .filter((change) => positionOf.get(change.id) !== change.position);
}

/** The `upsertGroup` or `upsertAccount` mutations that put `rows` in the order of `order`. */
export function reorderMutations(
  name: "upsertGroup" | "upsertAccount",
  rows: readonly { id: string; position: number }[],
  order: readonly string[],
): LocalMutationInput[] {
  return reorder(rows, order).map((args) =>
    name === "upsertGroup" ? { name, args } : { name, args },
  );
}
