/**
 * The items with the listed ones in the listed order, in the places that those
 * items already hold. Other items stay where they are, and an id with no item
 * counts for nothing.
 */
export function rearrange<Item extends { id: string }>(
  items: readonly Item[],
  ids: readonly string[],
): Item[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const inOrder = ids.flatMap((id) => byId.get(id) ?? []).values();
  const listed = new Set(ids);
  return items.map((item) =>
    listed.has(item.id) ? (inOrder.next().value ?? item) : item,
  );
}

/**
 * The ids between two places of a list, in their order after the item at `from`
 * moves to `to`. This is all that a move changes.
 */
export function spanOfMove(ids: readonly string[], from: number, to: number) {
  const moved = ids.toSpliced(from, 1).toSpliced(to, 0, ids[from]);
  return moved.slice(Math.min(from, to), Math.max(from, to) + 1);
}

/**
 * Where each listed row goes when the listed ids take, in their order, the
 * positions that those rows hold. Each row keeps its position when its id is not
 * listed. A row that waited for its lock can have a new position, and the order
 * of the query does not show this. Thus this sorts, and it runs after the lock.
 */
export function placesInOrder(
  rows: readonly { id: string; position: number }[],
  ids: readonly string[],
) {
  const byPosition = rows.toSorted((a, b) => a.position - b.position);
  return rearrange(byPosition, ids).map(({ id }, index) => ({
    id,
    position: byPosition[index].position,
  }));
}
