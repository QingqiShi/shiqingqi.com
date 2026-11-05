import type { AnalyticsIndex } from "../analytics/types.ts";

/** An expense is notable when it is at least this share of the month's spending… */
const NOTABLE_SHARE = 0.05;
/** …and among this many of the month's largest expenses. */
const MAX_NOTABLE_EXPENSES = 8;

/**
 * The rows of `[start, end)` that the calendar shows by name: every income,
 * and each of the largest expenses that is at least `NOTABLE_SHARE` of
 * `spending`, the month's money out. The rest add up to each day's
 * everyday spending.
 */
export function notableRows(
  index: AnalyticsIndex,
  start: number,
  end: number,
  spending: number,
): Set<number> {
  const notable = new Set<number>();
  const expenses: number[] = [];
  const floor = spending * NOTABLE_SHARE;
  for (let row = start; row < end; row++) {
    const amount = index.amounts[row];
    if (index.kinds[row] === 1) {
      if (amount !== 0) notable.add(row);
    } else if (amount < 0 && -amount >= floor) {
      expenses.push(row);
    }
  }
  expenses.sort(
    (a, b) =>
      index.amounts[a] - index.amounts[b] || index.days[a] - index.days[b],
  );
  for (const row of expenses.slice(0, MAX_NOTABLE_EXPENSES)) notable.add(row);
  return notable;
}
