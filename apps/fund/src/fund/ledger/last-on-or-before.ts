export function lastOnOrBefore<T extends { date: string }>(
  items: readonly T[],
  date: string,
): T | undefined {
  let low = 0;
  let high = items.length - 1;
  let found: T | undefined;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const item = items[middle];
    if (item.date <= date) {
      found = item;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}
