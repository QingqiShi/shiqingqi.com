import { fromEpochDay, toEpochDay } from "../dates/to-epoch-day.ts";

/**
 * One account's end-of-day balances on the days they change, in the account's
 * currency. Parallel typed arrays, ascending by day, so a lookup is a binary
 * search and a series of 10,000 days costs 120 KB.
 */
export interface BalanceSeries {
  /** Epoch days (see `toEpochDay`), strictly ascending. */
  readonly days: Int32Array;
  /** The end-of-day balance in minor units for the day at the same index. */
  readonly balances: Float64Array;
}

export interface ValuationInput {
  readonly on: string;
  readonly amountMinor: number;
}

export interface EntryInput {
  readonly date: string;
  readonly amountMinor: number;
}

export interface BalanceDayRow {
  day: string;
  balanceMinor: number;
}

export const EMPTY_BALANCE_SERIES: BalanceSeries = {
  days: new Int32Array(0),
  balances: new Float64Array(0),
};

/** Indices of `days` in ascending day order, stable; `null` when already in order. */
function sortOrder(days: Int32Array): Uint32Array | null {
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] > days[i]) {
      const order = Uint32Array.from(days.keys());
      return order.sort((a, b) => days[a] - days[b] || a - b);
    }
  }
  return null;
}

/**
 * The balance series of one account from its valuations and entries, in any
 * order. A valuation is the balance at the end of its day, so entries dated
 * on that day are inside it and are not added again; entries before the first
 * valuation add up from zero.
 */
export function computeBalanceDays(
  valuations: readonly ValuationInput[],
  entries: readonly EntryInput[],
): BalanceSeries {
  const valuationDays = Int32Array.from(valuations, (v) => toEpochDay(v.on));
  const entryDays = Int32Array.from(entries, (e) => toEpochDay(e.date));
  const valuationOrder = sortOrder(valuationDays);
  const entryOrder = sortOrder(entryDays);

  const days = new Int32Array(valuations.length + entries.length);
  const balances = new Float64Array(days.length);
  let count = 0;
  let running = 0;
  let v = 0;
  let e = 0;

  while (v < valuations.length || e < entries.length) {
    const vIndex = valuationOrder ? valuationOrder[v] : v;
    const eIndex = entryOrder ? entryOrder[e] : e;
    const day = Math.min(
      v < valuations.length ? valuationDays[vIndex] : Infinity,
      e < entries.length ? entryDays[eIndex] : Infinity,
    );

    let entriesTotal = 0;
    while (e < entries.length) {
      const index = entryOrder ? entryOrder[e] : e;
      if (entryDays[index] !== day) break;
      entriesTotal += entries[index].amountMinor;
      e++;
    }

    let valuation: number | null = null;
    while (v < valuations.length) {
      const index = valuationOrder ? valuationOrder[v] : v;
      if (valuationDays[index] !== day) break;
      valuation = valuations[index].amountMinor;
      v++;
    }

    running = valuation ?? running + entriesTotal;
    days[count] = day;
    balances[count] = running;
    count++;
  }

  return { days: days.slice(0, count), balances: balances.slice(0, count) };
}

/** A series from stored `account_balance_days` rows of one account, in any order. */
export function balanceSeriesFromRows(
  rows: readonly BalanceDayRow[],
): BalanceSeries {
  const rowDays = Int32Array.from(rows, (row) => toEpochDay(row.day));
  const order = sortOrder(rowDays);
  const days = new Int32Array(rows.length);
  const balances = new Float64Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const index = order ? order[i] : i;
    days[i] = rowDays[index];
    balances[i] = rows[index].balanceMinor;
  }
  return { days, balances };
}

/** The rows to store in `account_balance_days` for one account. */
export function balanceSeriesToRows(series: BalanceSeries): BalanceDayRow[] {
  return Array.from(series.days, (day, i) => ({
    day: fromEpochDay(day),
    balanceMinor: series.balances[i],
  }));
}
