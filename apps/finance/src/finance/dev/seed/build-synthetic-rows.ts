import type {
  accountGroups,
  accounts,
  categories,
  entries,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import { addDays } from "../../domain/dates/add-days.ts";
import { addMonths } from "../../domain/dates/add-months.ts";
import { startOfMonth } from "../../domain/dates/start-of-month.ts";
import { startOfWeek } from "../../domain/dates/start-of-week.ts";
import type { ExchangeRateRow } from "../../exchange-rates/exchange-rate-row-schema.ts";
import { addSyntheticMonths } from "./add-synthetic-months.ts";
import { addSyntheticRules } from "./add-synthetic-rules.ts";
import { addSyntheticWaitingRows } from "./add-synthetic-waiting-rows.ts";
import { createSyntheticContext, minorOf } from "./create-synthetic-context.ts";
import { createSyntheticLedger } from "./create-synthetic-ledger.ts";
import { SYNTHETIC_ACCOUNTS } from "./synthetic-accounts.ts";
import { SYNTHETIC_CATEGORIES } from "./synthetic-categories.ts";
import { SYNTHETIC_GROUPS } from "./synthetic-groups.ts";
import { SYNTHETIC_PAYEES } from "./synthetic-payees.ts";
import { SYNTHETIC_TAGS } from "./synthetic-tags.ts";

interface SyntheticOptions {
  years: number;
  transactionsPerYear: number;
  seed: number;
  /** The household's day, `YYYY-MM-DD`. History ends here. */
  today: string;
  /** The version every row gets. */
  version: number;
}

type Row<T extends { $inferInsert: object }> = T["$inferInsert"];

interface SyntheticRows {
  householdId: string;
  memberIds: { alex: string; sam: string };
  uncategorised: { expense: string; income: string };
  accountGroups: Row<typeof accountGroups>[];
  accounts: Row<typeof accounts>[];
  categories: Row<typeof categories>[];
  payees: Row<typeof payees>[];
  tags: Row<typeof tags>[];
  rules: Row<typeof rules>[];
  valuations: Row<typeof valuations>[];
  transactions: Row<typeof transactions>[];
  entries: Row<typeof entries>[];
  transactionTags: Row<typeof transactionTags>[];
  exchangeRates: ExchangeRateRow[];
}

/** Keeps random spending within what the two salaries cover. */
const SPENDING_FACTOR = 0.6;

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

/**
 * Every row of a synthetic household, from a seed. Pure: the same options
 * always give the same rows, so a database can be seeded again and match.
 * The household and its two members are created by `createHousehold`; their
 * ids come from here.
 */
export function buildSyntheticRows(options: SyntheticOptions): SyntheticRows {
  const { years, transactionsPerYear, seed, today, version } = options;
  const context = createSyntheticContext({ seed, today, version });
  const {
    prng,
    householdId,
    memberIds,
    memberOf,
    stamp,
    groupId,
    categoryId,
    uncategorised,
    tagId,
    payeeId,
    accountId,
  } = context;

  const start = addMonths(startOfMonth(today), -12 * years);
  const openingDay = addDays(start, -1);
  const amountScale = SPENDING_FACTOR * Math.min(3, 2000 / transactionsPerYear);

  // taxonomy

  const usedGroups = SYNTHETIC_GROUPS.filter((group) =>
    SYNTHETIC_ACCOUNTS.some((account) => account.group === group.key),
  );
  const openedAt = stamp(openingDay);
  const accountGroupRows = usedGroups.map((group, position) => ({
    id: groupId(group.key),
    householdId,
    name: group.name,
    side: group.side,
    position,
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));

  const categoryRows = SYNTHETIC_CATEGORIES.map((category, position) => ({
    id: categoryId(category.key),
    householdId,
    parentId: category.parent ? categoryId(category.parent) : null,
    kind: category.kind,
    name: category.name,
    emoji: category.emoji,
    color: category.color,
    position,
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));

  const tagRows = SYNTHETIC_TAGS.map((name, position) => ({
    id: tagId(name),
    householdId,
    name,
    position,
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));

  const payeeRows = SYNTHETIC_PAYEES.map((payee) => ({
    id: payeeId(payee.name),
    householdId,
    name: payee.name,
    defaultCategoryId: categoryId(payee.category),
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));
  // accounts

  const months: string[] = [];
  for (
    let month = start;
    month <= startOfMonth(today);
    month = addMonths(month, 1)
  ) {
    months.push(month);
  }
  const closeIndex = Math.floor(months.length * 0.4);
  const closedOn = addDays(months[closeIndex], 14);
  const sweepDay = addDays(closedOn, -1);

  const accountRows = SYNTHETIC_ACCOUNTS.map((account, position) => ({
    id: accountId(account.key),
    householdId,
    groupId: groupId(account.group),
    ownerMemberId: memberOf(account.owner),
    name: account.name,
    institution: account.institution,
    kind: account.kind,
    currency: account.currency,
    excludedFromNetWorth: account.excludedFromNetWorth ?? false,
    closedOn: account.key === "oldCurrent" ? closedOn : null,
    position,
    creditLimitMinor:
      account.creditLimit === undefined ? null : minorOf(account.creditLimit),
    statementDay: account.statementDay ?? null,
    paymentDueDay: account.paymentDueDay ?? null,
    defaultPaymentAccountId: account.paidBy ? accountId(account.paidBy) : null,
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));

  // transactions

  const ledger = createSyntheticLedger(context);
  const { add, valuationState, addValuation, postedByAccount } = ledger;

  const { ruleRows, occurrenceDays } = addSyntheticRules(context, ledger, {
    start,
    openedAt,
  });

  // valuations

  for (const account of SYNTHETIC_ACCOUNTS) {
    if (account.opening === undefined) continue;
    const opening = minorOf(account.opening);
    valuationState.set(account.key, opening);
    addValuation(account.key, openingDay, opening);
  }

  // the loop over months

  addSyntheticMonths(context, ledger, {
    months,
    amountScale,
    sweepDay,
    transactionsPerYear,
    occurrenceDays,
  });

  // closing the old account: everything left moves to a live one
  const leftInOldAccount =
    (valuationState.get("oldCurrent") ?? 0) +
    (postedByAccount.get("oldCurrent") ?? 0);
  if (leftInOldAccount > 0) {
    add({
      kind: "transfer",
      date: sweepDay,
      categoryId: null,
      memberId: memberIds.alex,
      note: "Close account",
      entries: [
        { account: "oldCurrent", amountMinor: -leftInOldAccount },
        { account: "alexCurrent", amountMinor: leftInOldAccount },
      ],
    });
  }

  addSyntheticWaitingRows(context, ledger);

  // exchange rates: one a week, a random walk around 0.78
  const exchangeRateRows: ExchangeRateRow[] = [];
  let rate = 0.78;
  for (
    let on = startOfWeek(addDays(openingDay, -7));
    on <= today;
    on = addDays(on, 7)
  ) {
    rate = clamp(rate + 0.006 * prng.normal(), 0.68, 0.88);
    exchangeRateRows.push({
      base: "USD",
      quote: "GBP",
      on,
      rate: Number(rate.toFixed(6)),
      source: "household",
    });
  }

  return {
    householdId,
    memberIds,
    uncategorised,
    accountGroups: accountGroupRows,
    accounts: accountRows,
    categories: categoryRows,
    payees: payeeRows,
    tags: tagRows,
    rules: ruleRows,
    valuations: ledger.valuationRows,
    transactions: ledger.transactionRows,
    entries: ledger.entryRows,
    transactionTags: ledger.transactionTagRows,
    exchangeRates: exchangeRateRows,
  };
}
