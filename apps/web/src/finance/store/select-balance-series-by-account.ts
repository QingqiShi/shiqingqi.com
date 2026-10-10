import { balanceAtEpochDay } from "../domain/balance/balance-at.ts";
import {
  balanceSeriesFromRows,
  computeBalanceDays,
  type BalanceSeries,
  type EntryInput,
  type ValuationInput,
} from "../domain/balance/compute-balance-days.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import type { AccountBalanceDayRow } from "../sync/row-schemas.ts";

type SeriesByAccount = ReadonlyMap<string, BalanceSeries>;

const serverCache = new WeakMap<
  ReadonlyMap<string, AccountBalanceDayRow>,
  SeriesByAccount
>();

/** The series the server stored in `account_balance_days`. */
function serverSeries(snapshot: ReplicaSnapshot): SeriesByAccount {
  const rows = snapshot.tables.accountBalanceDays;
  const cached = serverCache.get(rows);
  if (cached) return cached;
  const grouped = new Map<string, AccountBalanceDayRow[]>();
  for (const row of rows.values()) {
    const list = grouped.get(row.accountId);
    if (list) list.push(row);
    else grouped.set(row.accountId, [row]);
  }
  const series = new Map<string, BalanceSeries>();
  for (const [accountId, list] of grouped) {
    series.set(accountId, balanceSeriesFromRows(list));
  }
  serverCache.set(rows, series);
  return series;
}

/**
 * The server's series up to the day before `fromDay`, then the series worked
 * out again from the Replica's rows: the server balance on the day before
 * acts as a valuation, as in the server's own recompute.
 */
function recomputeFrom(
  server: BalanceSeries | undefined,
  fromDay: string,
  valuations: readonly ValuationInput[],
  entries: readonly EntryInput[],
): BalanceSeries {
  const dayBefore = addDays(fromDay, -1);
  const seedDay = toEpochDay(dayBefore);
  const seed = server ? balanceAtEpochDay(server, seedDay) : 0;
  const tail = computeBalanceDays(
    [{ on: dayBefore, amountMinor: seed }, ...valuations],
    entries,
  );
  let keep = 0;
  if (server) {
    while (keep < server.days.length && server.days[keep] < seedDay) keep++;
  }
  const days = new Int32Array(keep + tail.days.length);
  const balances = new Float64Array(days.length);
  if (server) {
    days.set(server.days.subarray(0, keep));
    balances.set(server.balances.subarray(0, keep));
  }
  days.set(tail.days, keep);
  balances.set(tail.balances, keep);
  return { days, balances };
}

let last: {
  server: SeriesByAccount;
  snapshot: ReplicaSnapshot;
  result: SeriesByAccount;
} | null = null;

/**
 * Each account's end-of-day balances. They come from the server's
 * `account_balance_days`; an account a local mutation changed is worked out
 * again from the day it changed, so a new Transaction moves its balance at
 * once.
 */
export function selectBalanceSeriesByAccount(
  snapshot: ReplicaSnapshot,
): SeriesByAccount {
  const server = serverSeries(snapshot);
  const pending = snapshot.pendingAccounts;
  if (pending.size === 0) return server;
  const { tables } = snapshot;
  if (
    last?.server === server &&
    last.snapshot.pendingAccounts === pending &&
    last.snapshot.tables.entries === tables.entries &&
    last.snapshot.tables.valuations === tables.valuations &&
    last.snapshot.tables.transactions === tables.transactions
  ) {
    return last.result;
  }

  const valuations = new Map<string, ValuationInput[]>();
  for (const valuation of tables.valuations.values()) {
    const fromDay = pending.get(valuation.accountId);
    if (fromDay === undefined || valuation.deletedAt !== null) continue;
    if (valuation.on < fromDay) continue;
    const list = valuations.get(valuation.accountId) ?? [];
    list.push(valuation);
    valuations.set(valuation.accountId, list);
  }
  const entries = new Map<string, EntryInput[]>();
  for (const entry of tables.entries.values()) {
    const fromDay = pending.get(entry.accountId);
    if (fromDay === undefined || entry.deletedAt !== null) continue;
    if (entry.date < fromDay) continue;
    const transaction = tables.transactions.get(entry.transactionId);
    if (transaction?.deletedAt !== null || transaction.status !== "posted") {
      continue;
    }
    const list = entries.get(entry.accountId) ?? [];
    list.push(entry);
    entries.set(entry.accountId, list);
  }

  const result = new Map(server);
  for (const [accountId, fromDay] of pending) {
    result.set(
      accountId,
      recomputeFrom(
        server.get(accountId),
        fromDay,
        valuations.get(accountId) ?? [],
        entries.get(accountId) ?? [],
      ),
    );
  }
  last = { server, snapshot, result };
  return result;
}
