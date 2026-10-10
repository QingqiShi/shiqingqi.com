import { toMinorUnits } from "../../domain/money/to-minor-units.ts";
import { coreDataDay } from "./core-data-day.ts";
import type { Rounder } from "./create-rounder.ts";
import {
  guessRefundOriginals,
  type RefundGuess,
} from "./guess-refund-originals.ts";
import { importId } from "./import-id.ts";
import { isTaxRefund } from "./is-tax-refund.ts";
import type { MappedAccounts } from "./map-accounts.ts";
import type { CategoryInfo, MappedCategories } from "./map-categories.ts";
import type { MappedPayeesAndTags } from "./map-payees-and-tags.ts";
import { textOfTransaction } from "./text-of-transaction.ts";
import { TRANSACTION_TYPE } from "./transaction-type.ts";
import type { MapOptions } from "./types.ts";
import type {
  AccountRow,
  EntryRow,
  TransactionRow,
  TransactionTagRow,
} from "./types.ts";
import type {
  SourceData,
  SourceSubAccount,
  SourceTransaction,
} from "./types.ts";

export interface MappedTransactions {
  transactions: TransactionRow[];
  entries: EntryRow[];
  transactionTags: TransactionTagRow[];
  /** Ledger rows that became an entry of their transaction. */
  linkedLedgerRowIds: Set<string>;
  /** Ledger rows whose transaction was dropped (an expected row past the window). */
  droppedLedgerRowIds: Set<string>;
  usedCategoryIds: Set<string>;
  /** Refunds MoneyThings kept unlinked, and the original the import chose for each. */
  refundGuesses: RefundGuess[];
  counts: {
    placeholders: number;
    expectedBeyondWindow: number;
    refundsReKinded: number;
    lendingAsTransfer: number;
    refundsWithoutCategory: number;
    refundsLinkedByGuess: number;
    refundsLeftUnlinked: number;
    taxRefundsAsIncome: number;
    unmatchedTransferIns: number;
  };
}

interface Context {
  source: SourceData;
  options: MapOptions;
  rounder: Rounder;
  accounts: MappedAccounts;
  categories: MappedCategories;
  payeesAndTags: MappedPayeesAndTags;
  ruleIdByCron: Map<string, string>;
}

/** Rates live in a numeric(18, 8) column; rounding here keeps reads equal to writes. */
function storedRate(rate: number | null) {
  return rate === null || rate === 1 ? null : Number(rate.toFixed(8));
}

/**
 * Transactions and their entries. A transfer pair becomes one transaction
 * with two entries; a refund income, linked or not, becomes an expense with
 * a positive amount; a ledger row linked to a transaction becomes one more
 * entry of that transaction on the receivable or loan account.
 */
export function mapTransactions(context: Context): MappedTransactions {
  const { source, options, rounder, accounts, categories, payeesAndTags } =
    context;
  const byId = new Map(source.transactions.map((t) => [t.id, t]));
  const accountById = new Map<string, AccountRow>(
    accounts.accounts.map((a) => [a.id, a]),
  );
  const result: MappedTransactions = {
    transactions: [],
    entries: [],
    transactionTags: [],
    linkedLedgerRowIds: new Set(),
    droppedLedgerRowIds: new Set(),
    usedCategoryIds: new Set(),
    refundGuesses: [],
    counts: {
      placeholders: 0,
      expectedBeyondWindow: 0,
      refundsReKinded: 0,
      lendingAsTransfer: 0,
      refundsWithoutCategory: 0,
      refundsLinkedByGuess: 0,
      refundsLeftUnlinked: 0,
      taxRefundsAsIncome: 0,
      unmatchedTransferIns: 0,
    },
  };
  const unlinkedRefundIds = new Set<string>();

  const originalOf = (t: SourceTransaction) => {
    if (t.type !== TRANSACTION_TYPE.income || !t.refundId) return undefined;
    if (t.refundId === t.id) return undefined;
    const original = byId.get(t.refundId);
    return original?.type === TRANSACTION_TYPE.expense ? original : undefined;
  };

  const refundsOf = new Map<string, SourceTransaction[]>();
  for (const t of source.transactions) {
    const original = originalOf(t);
    if (original) {
      refundsOf.set(original.id, [...(refundsOf.get(original.id) ?? []), t]);
    }
  }

  const ledgerRowsOf = new Map<string, SourceSubAccount[]>();
  for (const row of source.subAccounts) {
    if (!accounts.accountIdByLedgerAccountPk.has(row.accountPk)) continue;
    const linkedId = row.transactionId ?? row.transactionId1;
    let linked = linkedId === null ? undefined : byId.get(linkedId);
    if (linked?.type === TRANSACTION_TYPE.transferIn && linked.transferId) {
      linked = byId.get(linked.transferId) ?? linked;
    }
    if (linked) {
      ledgerRowsOf.set(linked.id, [
        ...(ledgerRowsOf.get(linked.id) ?? []),
        row,
      ]);
    }
  }

  const categoryOf = (t: SourceTransaction): CategoryInfo | undefined =>
    t.categoryId === null ? undefined : categories.bySourceId.get(t.categoryId);
  const linksReceivable = (t: SourceTransaction) =>
    (ledgerRowsOf.get(t.id) ?? []).some((row) =>
      accounts.receivableAccountIds.has(
        accounts.accountIdByLedgerAccountPk.get(row.accountPk) ?? "",
      ),
    );
  const expenseMinor = roundExpensesByYear(source, options);
  const statsMinor = (t: SourceTransaction) =>
    (expenseMinor.get(t.id) ?? 0) -
    (refundsOf.get(t.id) ?? []).reduce(
      (sum, refund) => sum + toMinorUnits(refund.amount, options.baseCurrency),
      0,
    );
  // Money lent or advanced, and money that comes back, moves between own
  // accounts. MoneyThings keeps it out of statistics: the expense has a 0
  // amount, and the returned money is a not-counted income (退款).
  const lendingIds = new Set(
    source.transactions
      .filter(
        (t) =>
          linksReceivable(t) &&
          ((t.type === TRANSACTION_TYPE.expense && statsMinor(t) === 0) ||
            (t.type === TRANSACTION_TYPE.income &&
              !originalOf(t) &&
              categoryOf(t)?.notCounted === true)),
      )
      .map((t) => t.id),
  );

  const accountIdOf = (subAccountId: string) => {
    const id = accounts.accountIdBySubAccount.get(subAccountId);
    if (!id) throw new Error(`No account for sub-account ${subAccountId}`);
    return id;
  };
  const currencyOf = (accountId: string) =>
    accountById.get(accountId)?.currency ?? options.baseCurrency;

  const transferInIds = new Set<string>();
  for (const t of source.transactions) {
    if (t.type === TRANSACTION_TYPE.transferOut && t.transferId) {
      transferInIds.add(t.transferId);
    }
  }

  for (const t of source.transactions) {
    if (t.type === TRANSACTION_TYPE.transferIn && transferInIds.has(t.id)) {
      continue;
    }
    const id = importId("transaction", t.id);
    const date = coreDataDay(t.flowTime, options.timeZone);
    const status = t.pending > 0 ? "expected" : "posted";
    const ledgerRows = ledgerRowsOf.get(t.id) ?? [];
    if (status === "expected" && date > options.expectedUntil) {
      result.counts.expectedBeyondWindow++;
      for (const row of ledgerRows) result.droppedLedgerRowIds.add(row.id);
      continue;
    }

    const legs: SourceTransaction[] = [t];
    const transferIn =
      t.type === TRANSACTION_TYPE.transferOut && t.transferId
        ? byId.get(t.transferId)
        : undefined;
    if (transferIn) legs.push(transferIn);
    if (t.type === TRANSACTION_TYPE.transferIn) {
      result.counts.unmatchedTransferIns++;
    }

    const entries: EntryRow[] = legs.map((leg, position) => {
      const accountId = accountIdOf(leg.subAccountId);
      const entryId = importId("entry", leg.id);
      return {
        id: entryId,
        householdId: options.householdId,
        transactionId: id,
        accountId,
        date,
        amountMinor: rounder.toMinor(
          leg.accountCurrencyAmount,
          currencyOf(accountId),
          { table: "entries", id: leg.id, accountId },
        ),
        fxRate: storedRate(leg.accountCurrencyRate),
        position,
        version: 0,
      };
    });
    for (const row of ledgerRows) {
      const accountId = accounts.accountIdByLedgerAccountPk.get(row.accountPk);
      if (!accountId) continue;
      const entryId = importId("entry", "ledger", row.id);
      result.linkedLedgerRowIds.add(row.id);
      entries.push({
        id: entryId,
        householdId: options.householdId,
        transactionId: id,
        accountId,
        date,
        amountMinor: rounder.toMinor(row.amount, currencyOf(accountId), {
          table: "ledger entries",
          id: row.id,
          accountId,
        }),
        position: entries.length,
        version: 0,
      });
    }

    const category = categoryOf(t);
    const original = originalOf(t);
    const round = (value: number) =>
      rounder.toMinor(value, options.baseCurrency, {
        table: "transactions",
        id: t.id,
      });
    let kind: TransactionRow["kind"];
    let amountMinor: number;
    let categoryId: string | null = null;
    let refundOfId: string | null = null;
    let member = category?.member ?? null;

    if (t.type === TRANSACTION_TYPE.expense) {
      kind = "expense";
      const ownMinor = expenseMinor.get(t.id) ?? 0;
      rounder.record(t.amount, ownMinor, options.baseCurrency, {
        table: "transactions",
        id: t.id,
      });
      amountMinor =
        ownMinor -
        (refundsOf.get(t.id) ?? []).reduce(
          (sum, refund) => sum + round(refund.amount),
          0,
        );
      categoryId = category?.id ?? null;
      if (lendingIds.has(t.id)) {
        kind = "transfer";
        categoryId = null;
        result.counts.lendingAsTransfer++;
      }
    } else if (original) {
      kind = "expense";
      amountMinor = round(t.amount);
      const originalCategory = categoryOf(original);
      categoryId = lendingIds.has(original.id)
        ? null
        : (originalCategory?.id ?? null);
      member = originalCategory?.member ?? null;
      refundOfId = importId("transaction", original.id);
      result.counts.refundsReKinded++;
      if (categoryId === null) result.counts.refundsWithoutCategory++;
    } else if (t.type === TRANSACTION_TYPE.income) {
      if (lendingIds.has(t.id)) {
        kind = "transfer";
        amountMinor = 0;
        result.counts.lendingAsTransfer++;
      } else if (category?.notCounted) {
        kind = "expense";
        amountMinor = round(t.amount);
        unlinkedRefundIds.add(id);
      } else {
        kind = "income";
        amountMinor = round(t.amount);
        categoryId = category?.id ?? null;
      }
    } else {
      kind = "transfer";
      amountMinor = 0;
    }

    if (
      kind !== "transfer" &&
      amountMinor === 0 &&
      ledgerRows.length === 0 &&
      entries.every((entry) => entry.amountMinor === 0)
    ) {
      result.counts.placeholders++;
      continue;
    }

    if (categoryId !== null) result.usedCategoryIds.add(categoryId);
    const firstAccount = accountById.get(entries[0].accountId);
    const { payeeId, tagIds } = payeesAndTags.resolve(
      legs.flatMap((leg) => leg.tagIds),
    );
    const notes = [...new Set(legs.map((leg) => leg.remark))].filter(
      (remark) => remark !== "",
    );

    result.transactions.push({
      id,
      householdId: options.householdId,
      kind,
      status,
      date,
      amountMinor,
      categoryId,
      payeeId,
      memberId: member
        ? options.memberIds[member]
        : (firstAccount?.ownerMemberId ?? null),
      ruleId: (t.cronId && context.ruleIdByCron.get(t.cronId)) || null,
      refundOfId,
      note: notes.join("\n"),
      source: "import",
      version: 0,
    });
    result.entries.push(...entries);
    for (const tagId of new Set(tagIds)) {
      result.transactionTags.push({
        transactionId: id,
        tagId,
        householdId: options.householdId,
        version: 0,
      });
    }
  }

  placeUnlinkedRefunds(
    result,
    unlinkedRefundIds,
    payeesAndTags,
    categories.otherIncomeId,
  );
  return result;
}

/**
 * Links each refund MoneyThings kept unlinked (a not-counted income) to its
 * most likely original expense, with that expense's category and member.
 * A refund with no likely original stays unlinked, under the category its
 * payee's history suggests. A tax refund undoes no spending, so it stays
 * income.
 */
function placeUnlinkedRefunds(
  result: MappedTransactions,
  refundIds: ReadonlySet<string>,
  payeesAndTags: MappedPayeesAndTags,
  otherIncomeId: string | null,
) {
  const textOf = textOfTransaction({
    payees: payeesAndTags.payees,
    tags: payeesAndTags.tags,
    transactionTags: result.transactionTags,
  });
  const accountOf = new Map<string, string>();
  for (const entry of result.entries) {
    if (entry.position === 0) {
      accountOf.set(entry.transactionId, entry.accountId);
    }
  }
  const refundedMinor = new Map<string, number>();
  for (const t of result.transactions) {
    if (t.refundOfId) {
      refundedMinor.set(
        t.refundOfId,
        (refundedMinor.get(t.refundOfId) ?? 0) + t.amountMinor,
      );
    }
  }
  const describe = (t: TransactionRow) => ({
    id: t.id,
    date: t.date,
    amountMinor: t.amountMinor,
    accountId: accountOf.get(t.id) ?? "",
    payeeId: t.payeeId ?? null,
    text: textOf(t),
  });

  const refunds: TransactionRow[] = [];
  for (const t of result.transactions) {
    if (!refundIds.has(t.id)) continue;
    if (isTaxRefund(textOf(t))) {
      t.kind = "income";
      t.categoryId = otherIncomeId;
      if (otherIncomeId !== null) result.usedCategoryIds.add(otherIncomeId);
      result.counts.taxRefundsAsIncome++;
    } else {
      refunds.push(t);
    }
  }
  const originals = result.transactions.filter(
    (t) =>
      t.kind === "expense" &&
      (t.status ?? "posted") === "posted" &&
      t.amountMinor < 0,
  );
  const byId = new Map(result.transactions.map((t) => [t.id, t]));
  result.refundGuesses = guessRefundOriginals(
    refunds.map(describe),
    originals.map((t) => ({
      ...describe(t),
      refundedMinor: refundedMinor.get(t.id) ?? 0,
      categoryId: t.categoryId ?? null,
    })),
  );
  for (const guess of result.refundGuesses) {
    const refund = byId.get(guess.refundId);
    if (!refund) continue;
    const original = guess.original ? byId.get(guess.original.id) : undefined;
    refund.categoryId = guess.categoryId;
    if (original) {
      refund.refundOfId = original.id;
      refund.memberId = original.memberId;
      result.counts.refundsLinkedByGuess++;
    } else {
      result.counts.refundsLeftUnlinked++;
    }
    if (guess.categoryId === null) result.counts.refundsWithoutCategory++;
    else result.usedCategoryIds.add(guess.categoryId);
  }
}

/**
 * The statistics amount of every expense in minor units. Posted expenses are
 * rounded along the running total of their year, so each year's total equals
 * MoneyThings' total of the unrounded amounts. Only an amount with a fraction
 * of a minor unit (from FX) can move, and by less than one minor unit.
 */
function roundExpensesByYear(source: SourceData, options: MapOptions) {
  const minor = new Map<string, number>();
  const byYear = new Map<string, SourceTransaction[]>();
  for (const t of source.transactions) {
    if (t.type !== TRANSACTION_TYPE.expense) continue;
    if (t.pending > 0) {
      minor.set(t.id, toMinorUnits(t.amount, options.baseCurrency));
      continue;
    }
    const year = coreDataDay(t.flowTime, options.timeZone).slice(0, 4);
    byYear.set(year, [...(byYear.get(year) ?? []), t]);
  }
  for (const rows of byYear.values()) {
    rows.sort((a, b) => a.flowTime - b.flowTime || a.id.localeCompare(b.id));
    let total = 0;
    let rounded = 0;
    for (const t of rows) {
      total += t.amount;
      const next = toMinorUnits(total, options.baseCurrency);
      minor.set(t.id, next - rounded);
      rounded = next;
    }
  }
  return minor;
}
