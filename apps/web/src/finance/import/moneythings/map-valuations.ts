import { toMinorUnits } from "../../domain/money/to-minor-units.ts";
import { coreDataDay, isSinceTheStart } from "./core-data-day.ts";
import type { Rounder } from "./create-rounder.ts";
import { importId } from "./import-id.ts";
import { isBalanceHolder, type MappedAccounts } from "./map-accounts.ts";
import type { AccountRow, ValuationRow } from "./types.ts";
import type { MapOptions } from "./types.ts";
import type { SourceData, SourceSubAccount } from "./types.ts";

/** The day a "from the start" anchor gets: before any transaction. */
export const SINCE_THE_START_DAY = "2000-01-01";

interface Anchor {
  time: number;
  amount: number;
}

interface Context {
  source: SourceData;
  options: MapOptions;
  rounder: Rounder;
  accounts: MappedAccounts;
  linkedLedgerRowIds: ReadonlySet<string>;
  droppedLedgerRowIds: ReadonlySet<string>;
}

/**
 * Valuations from MoneyThings balance anchors and from ledger rows with no
 * transaction.
 *
 * An anchor is the balance at one moment of a day, but a valuation is the
 * balance at the end of its day. So the transactions later on that day are
 * added to the anchor: the result is the balance MoneyThings shows at the end
 * of the day. The later anchor on one day wins.
 *
 * A ledger account (recoverable or repayable) is a list of signed rows. Each
 * row with no transaction gives a valuation: the sum of every row up to the
 * end of its day. Rows linked to a transaction are entries of it, and a
 * valuation on or after their day already holds them.
 */
export function mapValuations(context: Context): ValuationRow[] {
  const { source, options, rounder, accounts } = context;
  const accountById = new Map<string, AccountRow>(
    accounts.accounts.map((a) => [a.id, a]),
  );
  const rows: ValuationRow[] = [];
  const day = (seconds: number) => coreDataDay(seconds, options.timeZone);

  const postedBySub = new Map<
    string,
    { time: number; day: string; minor: number }[]
  >();
  for (const t of source.transactions) {
    if (t.pending > 0) continue;
    const accountId = accounts.accountIdBySubAccount.get(t.subAccountId);
    const currency = accountById.get(accountId ?? "")?.currency;
    if (!currency) continue;
    const list = postedBySub.get(t.subAccountId) ?? [];
    list.push({
      time: t.flowTime,
      day: day(t.flowTime),
      minor: toMinorUnits(t.accountCurrencyAmount, currency),
    });
    postedBySub.set(t.subAccountId, list);
  }

  const logsBySub = new Map<number, Anchor[]>();
  for (const log of source.modifyLogs) {
    const list = logsBySub.get(log.subAccountPk) ?? [];
    list.push({ time: log.activationTime, amount: log.amount });
    logsBySub.set(log.subAccountPk, list);
  }

  for (const sub of source.subAccounts) {
    if (!isBalanceHolder(sub)) continue;
    const accountId = accounts.accountIdBySubAccount.get(sub.id);
    if (!accountId) continue;
    const anchors: Anchor[] = [
      ...(logsBySub.get(sub.pk) ?? []),
      { time: sub.activationTime, amount: sub.amount },
    ];
    const winners = new Map<string, Anchor>();
    for (const anchor of anchors) {
      const on = isSinceTheStart(anchor.time)
        ? SINCE_THE_START_DAY
        : day(anchor.time);
      const current = winners.get(on);
      if (!current || anchor.time >= current.time) winners.set(on, anchor);
    }
    for (const [on, anchor] of winners) {
      const id = importId("valuation", sub.id, on);
      const laterThatDay = (postedBySub.get(sub.id) ?? [])
        .filter((t) => t.day === on && t.time > anchor.time)
        .reduce((sum, t) => sum + t.minor, 0);
      rows.push({
        id,
        householdId: options.householdId,
        accountId,
        on,
        amountMinor:
          rounder.toMinor(anchor.amount, sub.currency, {
            table: "valuations",
            id,
            accountId,
          }) + laterThatDay,
        source: "import",
        version: 0,
      });
    }
  }

  const ledgerRowsByAccount = new Map<number, SourceSubAccount[]>();
  for (const row of source.subAccounts) {
    if (!accounts.accountIdByLedgerAccountPk.has(row.accountPk)) continue;
    if (context.droppedLedgerRowIds.has(row.id)) continue;
    const list = ledgerRowsByAccount.get(row.accountPk) ?? [];
    list.push(row);
    ledgerRowsByAccount.set(row.accountPk, list);
  }
  const ledgerAccounts = new Map(source.accounts.map((a) => [a.pk, a]));

  for (const [accountPk, ledgerRows] of ledgerRowsByAccount) {
    const accountId = accounts.accountIdByLedgerAccountPk.get(accountPk);
    const ledgerAccount = ledgerAccounts.get(accountPk);
    if (!accountId || !ledgerAccount) continue;
    const currency =
      accountById.get(accountId)?.currency ?? options.baseCurrency;
    const dated = ledgerRows.map((row) => {
      const linked = context.linkedLedgerRowIds.has(row.id);
      return {
        day: day(row.activationTime),
        linked,
        minor: linked
          ? toMinorUnits(row.amount, currency)
          : rounder.toMinor(row.amount, currency, {
              table: "valuations",
              id: row.id,
              accountId,
            }),
      };
    });
    const valuationDays = new Set(
      dated.filter((row) => !row.linked).map((row) => row.day),
    );
    for (const on of valuationDays) {
      rows.push({
        id: importId("valuation", ledgerAccount.id, on),
        householdId: options.householdId,
        accountId,
        on,
        amountMinor: dated
          .filter((row) => row.day <= on)
          .reduce((sum, row) => sum + row.minor, 0),
        source: "import",
        version: 0,
      });
    }
  }

  return rows;
}
