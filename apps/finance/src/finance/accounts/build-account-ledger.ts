import { addDays } from "../domain/dates/add-days.ts";
import type { TransactionRow, ValuationRow } from "../sync/row-schemas.ts";
import { isFutureExpected } from "../transactions/is-future-expected.ts";
import { sumDayTotals } from "../transactions/sum-day-totals.ts";

export interface LedgerEntryItem {
  type: "entry";
  day: string;
  transaction: TransactionRow;
  /** On this account. */
  amountMinor: number;
  balanceAfter: number | null;
}

interface LedgerValuationItem {
  type: "valuation";
  day: string;
  valuation: ValuationRow;
  /** Null for the first record of the account. */
  changeMinor: number | null;
}

type LedgerItem = LedgerEntryItem | LedgerValuationItem;

interface LedgerDay {
  day: string;
  /** Posted expenses on this account net of refunds: negative for money out. Counts the whole day, also past the limit. */
  expenseMinor: number;
  incomeMinor: number;
  /** Valuations, then Expected Entries, then posted Entries. */
  items: LedgerItem[];
}

interface AccountLedger {
  /** Newest first. */
  days: LedgerDay[];
  hasMore: boolean;
}

interface AccountLedgerSources {
  /** Newest first. */
  valuations: readonly ValuationRow[];
  /** Newest first. An Expected one dated after `today` is left out. */
  transactions: readonly TransactionRow[];
  /** On this account. */
  amountOf: (transaction: TransactionRow) => number;
  today: string;
  limit: number;
  /** At the end of the day. */
  balanceAt: (day: string) => number;
}

function rank(item: LedgerItem) {
  if (item.type === "valuation") return 0;
  return item.transaction.status === "expected" ? 1 : 2;
}

function entryItem(
  transaction: TransactionRow,
  amountMinor: number,
): LedgerEntryItem {
  return {
    type: "entry",
    day: transaction.date,
    transaction,
    amountMinor,
    balanceAfter: null,
  };
}

export function buildAccountLedger({
  valuations,
  transactions,
  amountOf,
  today,
  limit,
  balanceAt,
}: AccountLedgerSources): AccountLedger {
  const shown = transactions.filter(
    (transaction) => !isFutureExpected(transaction, today),
  );
  const oldestDay = shown.at(-1)?.date;
  const items: LedgerItem[] = [];
  let v = 0;
  let e = 0;
  while (items.length < limit && (v < valuations.length || e < shown.length)) {
    const valuation = valuations.at(v);
    const transaction = shown.at(e);
    if (valuation && (!transaction || valuation.on >= transaction.date)) {
      const isFirst =
        v === valuations.length - 1 &&
        (oldestDay ?? valuation.on) >= valuation.on;
      items.push({
        type: "valuation",
        day: valuation.on,
        valuation,
        changeMinor: isFirst
          ? null
          : valuation.amountMinor - balanceAt(addDays(valuation.on, -1)),
      });
      v++;
    } else if (transaction) {
      items.push(entryItem(transaction, amountOf(transaction)));
      e++;
    }
  }
  const hasMore = v < valuations.length || e < shown.length;

  const itemsByDay = new Map<string, LedgerItem[]>();
  for (const item of items) {
    const list = itemsByDay.get(item.day);
    if (list) list.push(item);
    else itemsByDay.set(item.day, [item]);
  }
  const transactionsByDay = new Map<string, TransactionRow[]>();
  for (const transaction of shown) {
    if (itemsByDay.has(transaction.date)) {
      const list = transactionsByDay.get(transaction.date);
      if (list) list.push(transaction);
      else transactionsByDay.set(transaction.date, [transaction]);
    }
  }
  const days: LedgerDay[] = [...itemsByDay].map(([day, dayItems]) => ({
    day,
    ...sumDayTotals(transactionsByDay.get(day) ?? [], amountOf),
    items: dayItems,
  }));
  for (const day of days) day.items.sort((a, b) => rank(a) - rank(b));

  for (const day of days) {
    let running = balanceAt(day.day);
    let dayHasValuation = false;
    for (const item of day.items) {
      if (item.type === "valuation") {
        dayHasValuation = true;
      } else if (item.transaction.status === "posted" && !dayHasValuation) {
        item.balanceAfter = running;
        running -= item.amountMinor;
      }
    }
  }

  return { days, hasMore };
}
