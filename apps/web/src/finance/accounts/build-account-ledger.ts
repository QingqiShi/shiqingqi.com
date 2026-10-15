import { addDays } from "../domain/dates/add-days.ts";
import type { TransactionRow, ValuationRow } from "../sync/row-schemas.ts";
import { ledgerRunningBalances } from "./ledger-running-balances.ts";

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
  /** Valuations, then Expected Entries, then posted Entries. */
  items: LedgerItem[];
}

interface AccountLedger {
  /** Soonest first. */
  comingUp: LedgerEntryItem[];
  comingUpMinor: number;
  /** Newest first. */
  days: LedgerDay[];
  hasMore: boolean;
}

interface AccountLedgerSources {
  /** Newest first. */
  valuations: readonly ValuationRow[];
  /** Newest first. */
  transactions: readonly TransactionRow[];
  /** On this account. */
  amountOf: (transaction: TransactionRow) => number;
  today: string;
  /** Coming up is not in the limit. */
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
  let afterToday = 0;
  while ((transactions[afterToday]?.date ?? today) > today) afterToday++;
  const isComingUp = (index: number) =>
    index < afterToday && transactions[index]?.status === "expected";

  const comingUp = transactions
    .slice(0, afterToday)
    .filter((transaction) => transaction.status === "expected")
    .reverse()
    .map((transaction) => entryItem(transaction, amountOf(transaction)));
  const comingUpMinor = comingUp.reduce(
    (sum, item) => sum + item.amountMinor,
    0,
  );

  const oldestDay = transactions.findLast(
    (_, index) => !isComingUp(index),
  )?.date;
  const items: LedgerItem[] = [];
  let v = 0;
  let e = 0;
  const skipComingUp = () => {
    while (isComingUp(e)) e++;
  };
  skipComingUp();
  while (
    items.length < limit &&
    (v < valuations.length || e < transactions.length)
  ) {
    const valuation = valuations.at(v);
    const transaction = transactions.at(e);
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
      skipComingUp();
    }
  }
  const hasMore = v < valuations.length || e < transactions.length;

  const days: LedgerDay[] = [];
  for (const item of items) {
    const last = days.at(-1);
    if (last?.day === item.day) last.items.push(item);
    else days.push({ day: item.day, items: [item] });
  }
  for (const day of days) day.items.sort((a, b) => rank(a) - rank(b));

  const ordered = days.flatMap((day) => day.items);
  const balances = ledgerRunningBalances(
    ordered.map((item) =>
      item.type === "valuation"
        ? { day: item.day, valuationMinor: item.valuation.amountMinor }
        : {
            day: item.day,
            entry: {
              amountMinor: item.amountMinor,
              counts: item.transaction.status === "posted",
            },
          },
    ),
    balanceAt,
  );
  ordered.forEach((item, index) => {
    if (item.type === "entry") item.balanceAfter = balances[index] ?? null;
  });

  return { comingUp, comingUpMinor, days, hasMore };
}
