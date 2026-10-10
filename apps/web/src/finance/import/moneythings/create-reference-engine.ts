import { isBalanceHolder, isLedgerAccount } from "./map-accounts.ts";
import type { SourceAssetType, SourceData, SourceSubAccount } from "./types.ts";

interface TimedAmount {
  time: number;
  amount: number;
}

function upperBound(times: readonly number[], time: number) {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (times[middle] <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}

function cumulative(items: TimedAmount[]) {
  items.sort((a, b) => a.time - b.time);
  let sum = 0;
  return {
    times: items.map((item) => item.time),
    sums: items.map((item) => (sum += item.amount)),
  };
}

interface ReferenceEngine {
  /**
   * Net worth in base-currency major units, as a float, at a Core Data time:
   * the sum per MoneyThings asset type.
   */
  byAssetType: (
    time: number,
    options: { includeNoLongerUsed: boolean },
  ) => Map<SourceAssetType, number>;
}

/**
 * MoneyThings' own balance rules at full time precision, straight from the
 * source rows (the rules the importer must reproduce at day precision):
 *
 * - A balance holder's balance is its newest anchor at or before the time,
 *   plus its transactions after the anchor and up to the time. Before the
 *   first anchor, it is the sum of its transactions.
 * - A ledger account's balance is the sum of its rows up to the time.
 * - Net worth leaves out not-counted accounts and sub-accounts, and, for
 *   "today", no-longer-used accounts.
 * - A currency converts at the newest quote at or before the time, else the
 *   earliest quote.
 */
export function createReferenceEngine(
  source: SourceData,
  baseCurrency: string,
): ReferenceEngine {
  const quotes = new Map<string, TimedAmount[]>();
  for (const quote of source.fxRates) {
    const [from, to] = quote.symbol.split("/");
    const currency =
      to === baseCurrency ? from : from === baseCurrency ? to : null;
    if (!currency || currency === baseCurrency) continue;
    const rate = to === baseCurrency ? quote.price : 1 / quote.price;
    quotes.set(currency, [
      ...(quotes.get(currency) ?? []),
      { time: quote.updateTime, amount: rate },
    ]);
  }
  for (const list of quotes.values()) list.sort((a, b) => a.time - b.time);
  const rateAt = (currency: string, time: number) => {
    if (currency === baseCurrency) return 1;
    const list = quotes.get(currency);
    if (!list || list.length === 0) return 1;
    let found = list[0].amount;
    for (const quote of list) {
      if (quote.time <= time) found = quote.amount;
    }
    return found;
  };

  const transactionsBySub = new Map<string, TimedAmount[]>();
  for (const t of source.transactions) {
    transactionsBySub.set(t.subAccountId, [
      ...(transactionsBySub.get(t.subAccountId) ?? []),
      { time: t.flowTime, amount: t.accountCurrencyAmount },
    ]);
  }
  const anchorsBySub = new Map<number, TimedAmount[]>();
  for (const log of source.modifyLogs) {
    anchorsBySub.set(log.subAccountPk, [
      ...(anchorsBySub.get(log.subAccountPk) ?? []),
      { time: log.activationTime, amount: log.amount },
    ]);
  }

  const holders = source.subAccounts.filter(isBalanceHolder).map((sub) => {
    const anchors = [
      ...(anchorsBySub.get(sub.pk) ?? []),
      { time: sub.activationTime, amount: sub.amount },
    ].sort((a, b) => a.time - b.time);
    return {
      sub,
      anchorTimes: anchors.map((a) => a.time),
      anchorAmounts: anchors.map((a) => a.amount),
      transactions: cumulative(transactionsBySub.get(sub.id) ?? []),
    };
  });

  const sumUpTo = (
    series: { times: number[]; sums: number[] },
    time: number,
  ) => {
    const index = upperBound(series.times, time);
    return index === 0 ? 0 : series.sums[index - 1];
  };

  const holderBalance = (holder: (typeof holders)[number], time: number) => {
    const index = upperBound(holder.anchorTimes, time);
    if (index === 0) return sumUpTo(holder.transactions, time);
    const anchorTime = holder.anchorTimes[index - 1];
    return (
      holder.anchorAmounts[index - 1] +
      sumUpTo(holder.transactions, time) -
      sumUpTo(holder.transactions, anchorTime)
    );
  };

  const ledgerRowsByAccount = new Map<number, SourceSubAccount[]>();
  for (const row of source.subAccounts) {
    if (isBalanceHolder(row)) continue;
    ledgerRowsByAccount.set(row.accountPk, [
      ...(ledgerRowsByAccount.get(row.accountPk) ?? []),
      row,
    ]);
  }

  return {
    byAssetType(time, { includeNoLongerUsed }) {
      const totals = new Map<SourceAssetType, number>();
      for (const account of source.accounts) {
        if (account.notCounted) continue;
        if (account.noLongerUsed && !includeNoLongerUsed) continue;
        let balance = 0;
        if (isLedgerAccount(account)) {
          for (const row of ledgerRowsByAccount.get(account.pk) ?? []) {
            if (row.activationTime <= time) balance += row.amount;
          }
        } else {
          for (const holder of holders) {
            if (holder.sub.accountPk !== account.pk || holder.sub.notCounted) {
              continue;
            }
            balance +=
              holderBalance(holder, time) * rateAt(holder.sub.currency, time);
          }
        }
        totals.set(
          account.assetType,
          (totals.get(account.assetType) ?? 0) + balance,
        );
      }
      return totals;
    },
  };
}
