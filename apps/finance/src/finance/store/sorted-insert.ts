/** The first index whose item does not sort before `item`. */
function lowerBound<T>(
  items: readonly T[],
  item: T,
  compare: (a: T, b: T) => number,
) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compare(items[middle], item) < 0) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Inserts `item` into `items`, which `compare` keeps sorted. */
export function sortedInsert<T>(
  items: T[],
  item: T,
  compare: (a: T, b: T) => number,
) {
  items.splice(lowerBound(items, item, compare), 0, item);
}

/** Removes the item that compares equal to `item`, when there is one. */
export function sortedRemove<T>(
  items: T[],
  item: T,
  compare: (a: T, b: T) => number,
) {
  const index = lowerBound(items, item, compare);
  if (index < items.length && compare(items[index], item) === 0) {
    items.splice(index, 1);
  }
}
