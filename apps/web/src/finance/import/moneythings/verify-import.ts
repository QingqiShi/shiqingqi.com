import {
  computeBalanceDays,
  type BalanceSeries,
  type EntryInput,
  type ValuationInput,
} from "../../domain/balance/compute-balance-days.ts";
import {
  createFxIndex,
  type FxRateInput,
} from "../../domain/balance/create-fx-index.ts";
import {
  accountBalanceAt,
  netWorthAt,
  type NetWorthAccount,
} from "../../domain/balance/net-worth-at.ts";
import { addDays } from "../../domain/dates/add-days.ts";
import { addMonths } from "../../domain/dates/add-months.ts";
import { startOfMonth } from "../../domain/dates/start-of-month.ts";
import { toEpochDay } from "../../domain/dates/to-epoch-day.ts";
import {
  minorUnitsToDecimalString,
  toMinorUnits,
} from "../../domain/money/to-minor-units.ts";
import type { AccountKind } from "./assign-group.ts";
import { coreDataDay, dateToCoreData } from "./core-data-day.ts";
import { createReferenceEngine } from "./create-reference-engine.ts";
import { importId } from "./import-id.ts";
import { isTaxRefund } from "./is-tax-refund.ts";
import { SINCE_THE_START_DAY } from "./map-valuations.ts";
import { textOfTransaction } from "./text-of-transaction.ts";
import { TRANSACTION_TYPE } from "./transaction-type.ts";
import type { ImportRows, TransactionRow } from "./types.ts";
import type {
  SourceAssetType,
  SourceData,
  SourceTransaction,
} from "./types.ts";

interface VerifyAccount extends NetWorthAccount {
  readonly kind: AccountKind;
}

/** What a net-worth check reads: from mapped rows, or from the database. */
export interface BalanceState {
  accounts: readonly VerifyAccount[];
  seriesByAccount: ReadonlyMap<string, BalanceSeries>;
  fxRates: readonly FxRateInput[];
}

export interface SeriesPoint {
  date: string;
  netWorthMinor: number;
}

interface VerifyOptions {
  baseCurrency: string;
  timeZone: string;
  /** The household day of the backup. */
  asOf: string;
  /** The backup time, where MoneyThings' own figures are taken. */
  asOfTime: Date;
  /** When given, net worth at `asOf` must equal it. */
  expectedNetWorthMinor?: number;
  /** Net worth per day as MoneyThings computes it (net_worth_series.csv). */
  series?: readonly SeriesPoint[];
  /** Days to compare with MoneyThings' history; default: each month's first day. */
  historyDates?: readonly string[];
  /** Allowed difference on series days on or after an account closes. */
  closedToleranceMinor?: number;
}

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail: string;
}

interface VerificationReport {
  ok: boolean;
  checks: VerifyCheck[];
  netWorthMinor: number;
  lines: string[];
}

const KIND_GROUPS: readonly {
  label: string;
  kinds: readonly AccountKind[];
  assetTypes: readonly SourceAssetType[];
}[] = [
  { label: "cash", kinds: ["cash"], assetTypes: ["Savings Account"] },
  { label: "credit", kinds: ["credit"], assetTypes: ["Credit Account"] },
  {
    label: "investment + property",
    kinds: ["investment", "property"],
    assetTypes: ["Investment Account"],
  },
  {
    label: "receivable",
    kinds: ["receivable"],
    assetTypes: ["Recoverable Account"],
  },
  { label: "loan", kinds: ["loan"], assetTypes: ["Repayable Account"] },
];

const money = (minor: number) => minorUnitsToDecimalString(minor, "GBP");

/** The Core Data time of the last second of `day` in `timeZone`. */
function endOfDayCoreData(day: string, timeZone: string): number {
  const next = addDays(day, 1);
  let low = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000) - 14 * 3600;
  let high = low + 52 * 3600;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (coreDataDay(dateToCoreData(new Date(middle * 1000)), timeZone) < next) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return dateToCoreData(new Date(low * 1000));
}

/** Balance series per account from mapped rows, as the server would derive them. */
function balanceStateFromRows(
  rows: Pick<
    ImportRows,
    "accounts" | "valuations" | "transactions" | "entries" | "fxRates"
  >,
): BalanceState {
  const posted = new Set(
    rows.transactions
      .filter((t) => (t.status ?? "posted") === "posted" && !t.deletedAt)
      .map((t) => t.id),
  );
  const valuations = new Map<string, ValuationInput[]>();
  for (const v of rows.valuations) {
    if (v.deletedAt) continue;
    valuations.set(v.accountId, [
      ...(valuations.get(v.accountId) ?? []),
      { on: v.on, amountMinor: v.amountMinor },
    ]);
  }
  const entries = new Map<string, EntryInput[]>();
  for (const e of rows.entries) {
    if (e.deletedAt || !posted.has(e.transactionId)) continue;
    entries.set(e.accountId, [
      ...(entries.get(e.accountId) ?? []),
      { date: e.date, amountMinor: e.amountMinor },
    ]);
  }
  const seriesByAccount = new Map<string, BalanceSeries>();
  const accounts: VerifyAccount[] = [];
  for (const account of rows.accounts) {
    if (!account.id) continue;
    accounts.push({
      id: account.id,
      kind: account.kind,
      currency: account.currency,
      excludedFromNetWorth: account.excludedFromNetWorth ?? false,
      closedOn: account.closedOn ?? null,
    });
    seriesByAccount.set(
      account.id,
      computeBalanceDays(
        valuations.get(account.id) ?? [],
        entries.get(account.id) ?? [],
      ),
    );
  }
  return { accounts, seriesByAccount, fxRates: rows.fxRates };
}

/** Net worth and per-kind checks at `asOf`, plus the historical series. */
export function verifyBalances(
  state: BalanceState,
  source: SourceData,
  options: VerifyOptions,
): { checks: VerifyCheck[]; lines: string[]; netWorthMinor: number } {
  const checks: VerifyCheck[] = [];
  const lines: string[] = [];
  const fx = createFxIndex(state.fxRates, options.baseCurrency);
  const reference = createReferenceEngine(source, options.baseCurrency);
  const asOfTime = dateToCoreData(options.asOfTime);

  const netWorthMinor = netWorthAt(
    state.accounts,
    state.seriesByAccount,
    fx,
    options.asOf,
  );
  const referenceToday = reference.byAssetType(asOfTime, {
    includeNoLongerUsed: false,
  });
  const referenceTotal = Math.round(
    [...referenceToday.values()].reduce((sum, value) => sum + value, 0) * 100,
  );
  checks.push({
    name: `net worth at ${options.asOf} equals MoneyThings`,
    ok: netWorthMinor === referenceTotal,
    detail: `import ${money(netWorthMinor)}, MoneyThings ${money(referenceTotal)}`,
  });
  if (options.expectedNetWorthMinor !== undefined) {
    checks.push({
      name: `net worth at ${options.asOf} equals the expected figure`,
      ok: netWorthMinor === options.expectedNetWorthMinor,
      detail: `import ${money(netWorthMinor)}, expected ${money(options.expectedNetWorthMinor)}`,
    });
  }

  const epochDay = toEpochDay(options.asOf);
  for (const group of KIND_GROUPS) {
    let total = 0;
    for (const account of state.accounts) {
      if (account.excludedFromNetWorth || !group.kinds.includes(account.kind)) {
        continue;
      }
      total += fx.toBase(
        accountBalanceAt(
          account,
          state.seriesByAccount.get(account.id),
          options.asOf,
        ),
        account.currency,
        epochDay,
      );
    }
    const ours = Math.round(total) || 0;
    const theirs =
      Math.round(
        group.assetTypes.reduce(
          (sum, type) => sum + (referenceToday.get(type) ?? 0),
          0,
        ) * 100,
      ) || 0;
    checks.push({
      name: `${group.label} at ${options.asOf}`,
      ok: ours === theirs,
      detail: `import ${money(ours)}, MoneyThings ${money(theirs)}`,
    });
  }
  const property = state.accounts
    .filter((a) => a.kind === "property" && !a.excludedFromNetWorth)
    .reduce(
      (sum, a) =>
        sum +
        fx.toBase(
          accountBalanceAt(a, state.seriesByAccount.get(a.id), options.asOf),
          a.currency,
          epochDay,
        ),
      0,
    );
  lines.push(
    `property alone at ${options.asOf}: ${money(Math.round(property))}`,
  );

  // History mode: MoneyThings' figures keep closed accounts in history, so
  // compare without closing days to the penny, then report the closed view.
  const openAccounts = state.accounts.map((a) => ({ ...a, closedOn: null }));
  const firstClosedOn = state.accounts
    .filter((a) => !a.excludedFromNetWorth && a.closedOn !== null)
    .map((a) => a.closedOn ?? "")
    .sort()
    .at(0);
  const dates = [
    ...new Set([
      ...(options.historyDates ?? []),
      ...(options.series?.map((p) => p.date) ?? []),
    ]),
  ].sort();
  let historyMaxDiff = 0;
  let historyWorst = "";
  let historyDaysOff = 0;
  for (const date of dates) {
    const theirs = Math.round(
      [
        ...reference
          .byAssetType(endOfDayCoreData(date, options.timeZone), {
            includeNoLongerUsed: true,
          })
          .values(),
      ].reduce((sum, value) => sum + value, 0) * 100,
    );
    const ours = netWorthAt(openAccounts, state.seriesByAccount, fx, date);
    const diff = Math.abs(ours - theirs);
    if (diff > 0) historyDaysOff++;
    if (diff > historyMaxDiff) {
      historyMaxDiff = diff;
      historyWorst = date;
    }
  }
  if (dates.length > 0) {
    checks.push({
      name: `history (closed accounts kept) equals MoneyThings on ${String(dates.length)} days`,
      ok: historyMaxDiff <= 1,
      detail: `max difference ${money(historyMaxDiff)}${historyWorst ? ` on ${historyWorst}` : ""}; ${String(historyDaysOff)} days not exact`,
    });
  }

  if (options.series && options.series.length > 0) {
    const tolerance = options.closedToleranceMinor ?? 1100;
    let maxDiff = 0;
    let maxBeforeClose = 0;
    const over: string[] = [];
    for (const point of options.series) {
      const ours = netWorthAt(
        state.accounts,
        state.seriesByAccount,
        fx,
        point.date,
      );
      const diff = Math.abs(ours - point.netWorthMinor);
      const closed = firstClosedOn !== undefined && point.date >= firstClosedOn;
      const allowed = closed ? tolerance : 1;
      maxDiff = Math.max(maxDiff, diff);
      if (!closed) maxBeforeClose = Math.max(maxBeforeClose, diff);
      if (diff > allowed) {
        over.push(
          `${point.date}: import ${money(ours)}, series ${money(point.netWorthMinor)}, difference ${money(ours - point.netWorthMinor)}`,
        );
      }
    }
    checks.push({
      name: `series within £0.01 before ${firstClosedOn ?? "any closing"} and ${money(tolerance)} after`,
      ok: over.length === 0,
      detail: `max difference ${money(maxDiff)} (before the first closing ${money(maxBeforeClose)}); ${String(over.length)} days over tolerance`,
    });
    lines.push(...over.map((line) => `  over tolerance ${line}`));
  }

  return { checks, lines, netWorthMinor };
}

/**
 * Σ posted expense amounts per year against MoneyThings' Σ ZAMOUNT of
 * expenses. MoneyThings keeps a refund without an original out of
 * statistics (a not-counted income); the import books it as a refund, so
 * the import's spending is lower by exactly those refunds.
 */
function verifySpending(
  rows: Pick<ImportRows, "transactions">,
  source: SourceData,
  options: Pick<VerifyOptions, "timeZone">,
): VerifyCheck[] {
  const kindOf = new Map(rows.transactions.map((t) => [t.id, t.kind]));
  const sourceById = new Map(source.transactions.map((t) => [t.id, t]));
  const hasOriginal = (t: SourceTransaction) =>
    t.refundId !== null &&
    t.refundId !== t.id &&
    sourceById.get(t.refundId)?.type === TRANSACTION_TYPE.expense;
  const theirs = new Map<string, number>();
  const reclassified = new Map<string, number>();
  for (const t of source.transactions) {
    if (t.pending > 0) continue;
    const year = coreDataDay(t.flowTime, options.timeZone).slice(0, 4);
    if (t.type === TRANSACTION_TYPE.expense) {
      theirs.set(year, (theirs.get(year) ?? 0) + t.amount);
    } else if (
      t.type === TRANSACTION_TYPE.income &&
      !hasOriginal(t) &&
      kindOf.get(importId("transaction", t.id)) === "expense"
    ) {
      reclassified.set(
        year,
        (reclassified.get(year) ?? 0) + toMinorUnits(t.amount, "GBP"),
      );
    }
  }
  const ours = new Map<string, number>();
  for (const t of rows.transactions) {
    if (t.kind !== "expense" || (t.status ?? "posted") !== "posted") continue;
    const year = t.date.slice(0, 4);
    ours.set(year, (ours.get(year) ?? 0) + t.amountMinor);
  }
  const years = [...new Set([...theirs.keys(), ...ours.keys()])].sort();
  return years.map((year) => {
    const moneyThings = toMinorUnits(theirs.get(year) ?? 0, "GBP");
    const refunds = reclassified.get(year) ?? 0;
    const actual = ours.get(year) ?? 0;
    return {
      name: `spending in ${year}`,
      ok: actual === moneyThings + refunds,
      detail: `import ${money(actual)}, MoneyThings ${money(moneyThings)}${refunds === 0 ? "" : `, less ${money(refunds)} of refunds MoneyThings left out of statistics`}`,
    };
  });
}

/**
 * A refund is never income: every not-counted income becomes a refund or a
 * transfer. A tax refund is the exception: it stays income.
 */
function verifyRefundsNotIncome(
  rows: Pick<
    ImportRows,
    "transactions" | "payees" | "tags" | "transactionTags"
  >,
  source: SourceData,
): VerifyCheck {
  const byId = new Map(rows.transactions.map((t) => [t.id, t]));
  const textOf = textOfTransaction(rows);
  const categoryByPk = new Map(source.categories.map((c) => [c.pk, c]));
  const categoryById = new Map(source.categories.map((c) => [c.id, c]));
  const notCounted = (categoryId: string | null) => {
    let category =
      categoryId === null ? undefined : categoryById.get(categoryId);
    while (category) {
      if (category.notCounted) return true;
      category =
        category.parentPk === null
          ? undefined
          : categoryByPk.get(category.parentPk);
    }
    return false;
  };
  const asIncome = source.transactions
    .filter(
      (t) => t.type === TRANSACTION_TYPE.income && notCounted(t.categoryId),
    )
    .map((t) => byId.get(importId("transaction", t.id)))
    .filter((t): t is TransactionRow => t?.kind === "income");
  const taxRefunds = asIncome.filter((t) => isTaxRefund(textOf(t)));
  const refunds = asIncome.length - taxRefunds.length;
  return {
    name: "refunds imported as income",
    ok: refunds === 0,
    detail:
      taxRefunds.length === 0
        ? String(refunds)
        : `${String(refunds)}; tax refunds kept as income: ${taxRefunds
            .map((t) => `${t.date} ${money(t.amountMinor)}`)
            .join(", ")}`,
  };
}

/** The transaction count the source implies, against the mapped count. */
function verifyCounts(
  rows: ImportRows,
  source: SourceData,
  options: Pick<VerifyOptions, "timeZone"> & { expectedUntil: string },
): { checks: VerifyCheck[]; lines: string[] } {
  const total = source.transactions.length;
  const transferIns = source.transactions.filter(
    (t) => t.type === TRANSACTION_TYPE.transferIn,
  ).length;
  const pending = source.transactions.filter((t) => t.pending > 0);
  const pendingKept = pending.filter(
    (t) => coreDataDay(t.flowTime, options.timeZone) <= options.expectedUntil,
  ).length;
  const placeholders = source.transactions.filter(
    (t) =>
      t.type !== TRANSACTION_TYPE.transferOut &&
      t.type !== TRANSACTION_TYPE.transferIn &&
      Math.abs(t.amount) < 0.005 &&
      Math.abs(t.accountCurrencyAmount) < 0.005,
  ).length;
  const expected =
    total - pending.length + pendingKept - transferIns - placeholders;
  const lines = Object.entries(rows).map(
    ([table, list]: [string, readonly unknown[]]) =>
      `  ${table}: ${String(list.length)}`,
  );
  return {
    checks: [
      {
        name: "transaction count",
        ok: expected === rows.transactions.length,
        detail: `${String(total)} − ${String(pending.length)} pending + ${String(pendingKept)} expected kept − ${String(transferIns)} transfer-in rows − ${String(placeholders)} placeholders = ${String(expected)}; import ${String(rows.transactions.length)}`,
      },
    ],
    lines,
  };
}

/** The first day of every month from the first activity up to `asOf`. */
export function monthlyHistoryDates(
  rows: Pick<ImportRows, "valuations" | "entries">,
  asOf: string,
): string[] {
  const first = [
    ...rows.valuations
      .map((v) => v.on)
      .filter((on) => on > SINCE_THE_START_DAY),
    ...rows.entries.map((e) => e.date),
  ]
    .sort()
    .at(0);
  const dates: string[] = [];
  for (
    let day = first ? startOfMonth(first) : asOf;
    day <= asOf;
    day = addMonths(day, 1)
  ) {
    dates.push(day);
  }
  return [...dates, asOf];
}

/** Runs every check on mapped rows. */
export function verifyImport(
  rows: ImportRows,
  source: SourceData,
  options: VerifyOptions & { expectedUntil: string },
): VerificationReport {
  const balances = verifyBalances(balanceStateFromRows(rows), source, {
    ...options,
    historyDates:
      options.historyDates ?? monthlyHistoryDates(rows, options.asOf),
  });
  const counts = verifyCounts(rows, source, options);
  const checks = [
    ...balances.checks,
    ...verifySpending(rows, source, options),
    verifyRefundsNotIncome(rows, source),
    ...counts.checks,
  ];
  return {
    ok: checks.every((check) => check.ok),
    checks,
    netWorthMinor: balances.netWorthMinor,
    lines: [...balances.lines, "rows per table:", ...counts.lines],
  };
}
