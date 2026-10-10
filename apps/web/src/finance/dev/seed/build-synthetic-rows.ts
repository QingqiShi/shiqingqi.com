import { normaliseBankText } from "../../ai/normalise-bank-text.ts";
import type {
  accountGroups,
  accounts,
  categories,
  entries,
  fxRates,
  payeeAliases,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import { addDays, daysBetween } from "../../domain/dates/add-days.ts";
import { addMonths } from "../../domain/dates/add-months.ts";
import { endOfMonth, startOfMonth } from "../../domain/dates/start-of-month.ts";
import { startOfWeek } from "../../domain/dates/start-of-week.ts";
import { daysInMonth, parseDay } from "../../domain/dates/to-epoch-day.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import { GROUP_SEEDS } from "../../import/moneythings/assign-group.ts";
import { occurrenceId } from "../../rules/materialise-rules.ts";
import {
  nextOccurrence,
  occurrencesBetween,
  type RuleSchedule,
} from "../../rules/next-occurrence.ts";
import type { RuleTemplate } from "../../rules/rule-template-schema.ts";
import { createPrng } from "./create-prng.ts";
import {
  SYNTHETIC_ACCOUNTS,
  type SyntheticAccount,
  type SyntheticOwner,
} from "./synthetic-accounts.ts";
import { SYNTHETIC_CATEGORIES } from "./synthetic-categories.ts";
import { SYNTHETIC_PAYEES, type SyntheticPayee } from "./synthetic-payees.ts";
import { SYNTHETIC_RULES, type SyntheticRule } from "./synthetic-rules.ts";
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
  payeeAliases: Row<typeof payeeAliases>[];
  tags: Row<typeof tags>[];
  rules: Row<typeof rules>[];
  valuations: Row<typeof valuations>[];
  transactions: Row<typeof transactions>[];
  entries: Row<typeof entries>[];
  transactionTags: Row<typeof transactionTags>[];
  fxRates: Row<typeof fxRates>[];
}

/** Keeps random spending within what the two salaries cover. */
const SPENDING_FACTOR = 0.6;
const CARD_REPAYMENT_DAY = 5;
const RETAIL_PURCHASES_PER_REFUND = 12;
const RECENT_BANK_DAYS = 90;
const REVIEW_WINDOW_DAYS = 8;
const EXPECTED_WINDOW_DAYS = 7;

const SPENDING_ACCOUNT_WEIGHTS: Record<string, number> = {
  visa: 0.27,
  mastercard: 0.22,
  amex: 0.12,
  alexCurrent: 0.13,
  samCurrent: 0.12,
  oldCurrent: 0.03,
};

const NOTES = ["Split bill", "Birthday", "Weekend away", "Work lunch"];

const REVIEW_ROWS = [
  {
    account: "alexCurrent",
    text: "CARD PAYMENT TO STRATFORD CAFE 8841",
    pounds: -14.2,
    category: null,
    payee: null,
    confidence: 0.42,
  },
  {
    account: "alexCurrent",
    text: "DIRECT DEBIT UNKNOWN LTD REF 2291",
    pounds: -86,
    category: "household",
    payee: null,
    confidence: 0.55,
  },
  {
    account: "mastercard",
    text: "PAYPAL *MARKETPLACE 35314369001",
    pounds: -23.99,
    category: "online",
    payee: null,
    confidence: 0.61,
  },
  {
    account: "samCurrent",
    text: "FASTER PAYMENT REF 5521 FRIEND",
    pounds: 120,
    category: null,
    payee: null,
    confidence: 0.5,
  },
  {
    account: "visa",
    text: "TESCO STORES 3214",
    pounds: -31.45,
    category: "grocery",
    payee: "Tesco",
    confidence: 0.74,
  },
] as const;

const EXPECTED_ROWS = [
  { account: "alexCurrent", payee: "Smile Dental", pounds: 85, inDays: 3 },
  { account: "visa", payee: "Trainline", pounds: 42, inDays: 5 },
  { account: "amex", payee: "Ocado", pounds: 110, inDays: 1 },
] as const;

function minorOf(pounds: number) {
  return Math.round(pounds * 100);
}

function monthKey(day: string) {
  return day.slice(0, 7);
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

interface NewTransaction {
  id?: string;
  kind: "expense" | "income" | "transfer";
  status?: "posted" | "expected";
  date: string;
  /** The statistics amount: an expense is negative, a refund and an income positive, a transfer 0. */
  amountMinor: number;
  categoryId: string | null;
  payeeId?: string | null;
  memberId?: string | null;
  ruleId?: string | null;
  refundOfId?: string | null;
  note?: string;
  source?: "manual" | "rule" | "bank";
  needsReview?: boolean;
  aiConfidence?: number | null;
  entries: { account: string; amountMinor: number; id?: string }[];
  tagIds?: string[];
  /** A repayment or a claim: it pays off the month's charges and is not one itself. */
  settles?: boolean;
}

/**
 * Every row of a synthetic household, from a seed. Pure: the same options
 * always give the same rows, so a database can be seeded again and match.
 * The household and its two members are created by `createHousehold`; their
 * ids come from here.
 */
export function buildSyntheticRows(options: SyntheticOptions): SyntheticRows {
  const { years, transactionsPerYear, seed, today, version } = options;
  const prng = createPrng(seed);
  const id = (...parts: (string | number)[]) =>
    nameBasedUuid(["synthetic", seed, ...parts].join(":"));
  const householdId = id("household");
  const memberIds = { alex: id("member", "alex"), sam: id("member", "sam") };
  const memberOf = (owner: SyntheticOwner) =>
    owner === null ? null : memberIds[owner];
  const randomMember = () => memberIds[prng.pick(["alex", "sam"] as const)];

  const start = addMonths(startOfMonth(today), -12 * years);
  const openingDay = addDays(start, -1);
  const amountScale = SPENDING_FACTOR * Math.min(3, 2000 / transactionsPerYear);
  const stamp = (day: string) => {
    const date = day < today ? day : today;
    const hour = String(prng.int(7, 22)).padStart(2, "0");
    const minute = String(prng.int(0, 59)).padStart(2, "0");
    return new Date(`${date}T${hour}:${minute}:00.000Z`);
  };
  const randomDay = (from: string, to: string) =>
    addDays(from, prng.int(0, Math.max(0, daysBetween(from, to))));

  // taxonomy

  const groupId = (key: string) => id("group", key);
  const usedGroups = GROUP_SEEDS.filter((group) =>
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

  const categoryId = (key: string) => id("category", key);
  const uncategorised = {
    expense: id("category", "uncategorised", "expense"),
    income: id("category", "uncategorised", "income"),
  };
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

  const tagId = (name: string) => id("tag", name);
  const tagRows = SYNTHETIC_TAGS.map((name, position) => ({
    id: tagId(name),
    householdId,
    name,
    position,
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));

  const payeeByName = new Map(SYNTHETIC_PAYEES.map((p) => [p.name, p]));
  const payeeId = (name: string) => id("payee", name);
  const payeeRows = SYNTHETIC_PAYEES.map((payee) => ({
    id: payeeId(payee.name),
    householdId,
    name: payee.name,
    defaultCategoryId: categoryId(payee.category),
    version,
    createdAt: openedAt,
    updatedAt: openedAt,
  }));
  const aliasSeen = new Set<string>();
  const aliasRows: SyntheticRows["payeeAliases"] = [];
  for (const payee of SYNTHETIC_PAYEES) {
    if (!payee.bankText) continue;
    const alias = normaliseBankText(payee.bankText);
    if (aliasSeen.has(alias)) continue;
    aliasSeen.add(alias);
    aliasRows.push({
      householdId,
      alias,
      payeeId: payeeId(payee.name),
      version,
      updatedAt: openedAt,
    });
  }

  // accounts

  const accountId = (key: string) => id("account", key);
  const accountByKey = new Map(SYNTHETIC_ACCOUNTS.map((a) => [a.key, a]));
  const accountSpec = (key: string): SyntheticAccount => {
    const spec = accountByKey.get(key);
    if (!spec) throw new Error(`Unknown synthetic account ${key}`);
    return spec;
  };
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

  const transactionRows: SyntheticRows["transactions"] = [];
  const entryRows: SyntheticRows["entries"] = [];
  const transactionTagRows: SyntheticRows["transactionTags"] = [];
  const countByMonth = new Map<string, number>();
  const postedByMonthAndAccount = new Map<string, number>();
  const settledByMonthAndAccount = new Map<string, number>();
  const postedByAccount = new Map<string, number>();
  let transactionCounter = 0;

  const addToMap = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };
  const chargedIn = (account: string, month: string) =>
    (postedByMonthAndAccount.get(`${account}|${month}`) ?? 0) -
    (settledByMonthAndAccount.get(`${account}|${month}`) ?? 0);

  function add(transaction: NewTransaction) {
    const transactionId =
      transaction.id ?? id("transaction", transactionCounter++);
    const status = transaction.status ?? "posted";
    const createdAt = stamp(transaction.date);
    transactionRows.push({
      id: transactionId,
      householdId,
      kind: transaction.kind,
      status,
      date: transaction.date,
      amountMinor: transaction.amountMinor,
      categoryId: transaction.categoryId,
      payeeId: transaction.payeeId ?? null,
      memberId: transaction.memberId ?? null,
      ruleId: transaction.ruleId ?? null,
      refundOfId: transaction.refundOfId ?? null,
      note: transaction.note ?? "",
      source: transaction.source ?? "manual",
      needsReview: transaction.needsReview ?? false,
      aiConfidence: transaction.aiConfidence ?? null,
      version,
      createdAt,
      updatedAt: createdAt,
    });
    transaction.entries.forEach((entry, position) => {
      entryRows.push({
        id: entry.id ?? id("entry", transactionId, position),
        householdId,
        transactionId,
        accountId: accountId(entry.account),
        date: transaction.date,
        amountMinor: entry.amountMinor,
        position,
        version,
        createdAt,
        updatedAt: createdAt,
      });
      if (status === "posted") {
        addToMap(
          postedByMonthAndAccount,
          `${entry.account}|${monthKey(transaction.date)}`,
          entry.amountMinor,
        );
        addToMap(postedByAccount, entry.account, entry.amountMinor);
        if (transaction.settles) {
          addToMap(
            settledByMonthAndAccount,
            `${entry.account}|${monthKey(transaction.date)}`,
            entry.amountMinor,
          );
        }
      }
    });
    for (const tag of new Set(transaction.tagIds ?? [])) {
      transactionTagRows.push({
        transactionId,
        tagId: tag,
        householdId,
        version,
      });
    }
    addToMap(countByMonth, monthKey(transaction.date), 1);
    return transactionId;
  }

  // rules and their occurrences

  const ruleRows: SyntheticRows["rules"] = [];
  const occurrenceDays = new Map<string, string[]>();
  const expectedHorizon = addDays(today, EXPECTED_WINDOW_DAYS);
  for (const spec of SYNTHETIC_RULES) {
    const ruleId = id("rule", spec.key);
    const base: RuleSchedule = {
      unit: "month",
      interval: 1,
      dayOfMonth: spec.dayOfMonth,
      weekday: null,
      monthOfYear: null,
      startsOn: start,
      endsOn: null,
    };
    const schedule = {
      ...base,
      startsOn: nextOccurrence(base, start),
    };
    const amountMinor = minorOf(spec.amount);
    const template: RuleTemplate = {
      kind: spec.kind,
      amountMinor:
        spec.kind === "expense"
          ? -amountMinor
          : spec.kind === "income"
            ? amountMinor
            : 0,
      categoryId: spec.category ? categoryId(spec.category) : null,
      payeeId: spec.payee ? payeeId(spec.payee) : null,
      memberId: memberOf(spec.member),
      note: "",
      entries: ruleEntries(spec, amountMinor).map((entry) => ({
        accountId: accountId(entry.account),
        amountMinor: entry.amountMinor,
      })),
      tagIds: [],
    };
    const days = occurrencesBetween(
      schedule,
      schedule.startsOn,
      expectedHorizon,
    );
    occurrenceDays.set(
      spec.key,
      days.filter((day) => day <= today),
    );
    ruleRows.push({
      id: ruleId,
      householdId,
      name: spec.name,
      unit: "month",
      interval: 1,
      dayOfMonth: spec.dayOfMonth,
      startsOn: schedule.startsOn,
      nextOn: nextOccurrence(schedule, addDays(expectedHorizon, 1)),
      autoPost: spec.autoPost,
      template,
      version,
      createdAt: openedAt,
      updatedAt: openedAt,
    });

    for (const day of days) {
      const overdue =
        !spec.autoPost && day <= today && daysBetween(day, today) < 3;
      const status = day > today || overdue ? "expected" : "posted";
      const factor =
        spec.varies && day <= today
          ? 1 + spec.varies * (prng.next() * 2 - 1)
          : 1;
      const occurrenceAmount = Math.round(amountMinor * factor);
      const entries = ruleEntries(spec, occurrenceAmount);
      add({
        id: occurrenceId(ruleId, day),
        kind: spec.kind,
        status,
        date: day,
        amountMinor:
          spec.kind === "expense"
            ? -occurrenceAmount
            : spec.kind === "income"
              ? occurrenceAmount
              : 0,
        categoryId: spec.category ? categoryId(spec.category) : null,
        payeeId: spec.payee ? payeeId(spec.payee) : null,
        memberId: memberOf(spec.member),
        ruleId,
        source: "rule",
        entries: entries.map((entry, index) => ({
          ...entry,
          id: nameBasedUuid(`rule:${ruleId}:${day}:${String(index)}`),
        })),
      });
    }
  }

  // valuations

  const valuationRows: SyntheticRows["valuations"] = [];
  const valuationState = new Map<string, number>();
  const addValuation = (account: string, on: string, amountMinor: number) => {
    const createdAt = stamp(on);
    valuationRows.push({
      id: id("valuation", account, on),
      householdId,
      accountId: accountId(account),
      on,
      amountMinor,
      source: "manual",
      version,
      createdAt,
      updatedAt: createdAt,
    });
  };
  for (const account of SYNTHETIC_ACCOUNTS) {
    if (account.opening === undefined) continue;
    const opening = minorOf(account.opening);
    valuationState.set(account.key, opening);
    addValuation(account.key, openingDay, opening);
  }

  // the loop over months

  const isCard = (account: SyntheticAccount) => account.kind === "credit";
  const cards = SYNTHETIC_ACCOUNTS.filter(isCard);
  const spendingPayees = SYNTHETIC_PAYEES.filter((p) => p.weight > 0);
  const workExpensePayees = [
    "Trainline",
    "Pret A Manger",
    "Uber",
    "Costa Coffee",
  ]
    .map((name) => payeeByName.get(name))
    .filter((payee): payee is SyntheticPayee => payee !== undefined);
  let retailPurchases = 0;
  const repaymentIndex = Math.floor(months.length * 0.6);
  const recentBankFrom = addDays(today, -RECENT_BANK_DAYS);

  function spend(
    account: string,
    payee: SyntheticPayee,
    date: string,
    options: { forceManual?: boolean; tagIds?: string[] } = {},
  ) {
    const median = payee.median * 100 * amountScale;
    const amount = Math.max(
      20,
      Math.round(median * Math.exp(payee.spread * prng.normal())),
    );
    const spec = accountSpec(account);
    const member = spec.owner ? memberOf(spec.owner) : randomMember();
    const bank =
      !options.forceManual &&
      account !== "oldCurrent" &&
      date >= recentBankFrom &&
      prng.chance(0.45);
    const tagIds = options.tagIds ?? [];
    if (payee.tag && prng.chance(0.8)) tagIds.push(tagId(payee.tag));
    else if (payee.name === "Amazon" && prng.chance(0.03)) {
      tagIds.push(tagId("Gift"));
    } else if (payee.category === "dining" && prng.chance(0.05)) {
      tagIds.push(tagId("Date night"));
    }
    const transactionId = add({
      kind: "expense",
      date,
      amountMinor: -amount,
      categoryId: categoryId(payee.category),
      payeeId: payeeId(payee.name),
      memberId: member,
      note: bank
        ? (payee.bankText ?? "")
        : prng.chance(0.06)
          ? prng.pick(NOTES)
          : "",
      source: bank ? "bank" : "manual",
      aiConfidence: bank ? 0.8 + 0.19 * prng.next() : null,
      entries: [{ account, amountMinor: -amount }],
      tagIds,
    });

    if (payee.retail) retailPurchases++;
    const refundDay = addDays(date, prng.int(3, 20));
    if (
      payee.retail &&
      retailPurchases % RETAIL_PURCHASES_PER_REFUND === 0 &&
      account !== "oldCurrent" &&
      refundDay <= today
    ) {
      add({
        kind: "expense",
        date: refundDay,
        amountMinor: amount,
        categoryId: categoryId(payee.category),
        payeeId: payeeId(payee.name),
        memberId: member,
        refundOfId: transactionId,
        note: "Refund",
        entries: [{ account, amountMinor: amount }],
      });
    }
    return transactionId;
  }

  const accountWeight = (key: string, from: string) => {
    if (key === "oldCurrent" && from > sweepDay) return 0;
    return SPENDING_ACCOUNT_WEIGHTS[key] ?? 0;
  };

  for (const [index, monthStart] of months.entries()) {
    const thisMonth = monthKey(monthStart);
    const previousMonth = monthKey(addMonths(monthStart, -1));
    const monthEnd =
      endOfMonth(monthStart) < today ? endOfMonth(monthStart) : today;
    const repaymentDay = addDays(monthStart, CARD_REPAYMENT_DAY - 1);

    if (index > 0 && repaymentDay <= today) {
      for (const card of cards) {
        const due = -chargedIn(card.key, previousMonth);
        if (due <= 0 || !card.paidBy) continue;
        add({
          kind: "transfer",
          date: repaymentDay,
          amountMinor: 0,
          categoryId: null,
          memberId: memberOf(card.owner),
          note: "Card repayment",
          settles: true,
          entries: [
            { account: card.paidBy, amountMinor: -due },
            { account: card.key, amountMinor: due },
          ],
        });
      }
    }

    for (let n = prng.int(2, 4); n > 0; n--) {
      spend(
        "workExpenses",
        prng.pick(workExpensePayees),
        randomDay(monthStart, monthEnd),
        { forceManual: true, tagIds: [tagId("Reimbursable")] },
      );
    }
    const claimDay = addDays(monthStart, 19);
    const claimed = -chargedIn("workExpenses", previousMonth);
    if (index > 0 && claimDay <= today && claimed > 0) {
      add({
        kind: "income",
        date: claimDay,
        amountMinor: claimed,
        categoryId: categoryId("reimbursement"),
        payeeId: payeeId("Acme Ltd"),
        memberId: memberIds.alex,
        note: "Expenses claim",
        settles: true,
        entries: [{ account: "workExpenses", amountMinor: claimed }],
      });
    }

    if (index === repaymentIndex && addDays(monthStart, 11) <= today) {
      add({
        kind: "transfer",
        date: addDays(monthStart, 11),
        amountMinor: 0,
        categoryId: null,
        memberId: memberIds.alex,
        note: "Friend paid back part of the loan",
        entries: [
          { account: "lent", amountMinor: -40_000 },
          { account: "alexCurrent", amountMinor: 40_000 },
        ],
      });
    }

    if (prng.chance(0.35)) {
      add({
        kind: "income",
        date: randomDay(monthStart, monthEnd),
        amountMinor: Math.round(2200 * amountScale),
        categoryId: categoryId("secondHand"),
        payeeId: payeeId("Vinted"),
        memberId: memberIds.sam,
        entries: [
          {
            account: "samCurrent",
            amountMinor: Math.round(2200 * amountScale),
          },
        ],
      });
    }

    const daysCovered = daysBetween(monthStart, monthEnd) + 1;
    const { year, month } = parseDay(monthStart);
    const target = Math.round(
      ((transactionsPerYear / 12) * daysCovered) / daysInMonth(year, month),
    );
    const accountKeys = Object.keys(SPENDING_ACCOUNT_WEIGHTS);
    for (
      let remaining = target - (countByMonth.get(thisMonth) ?? 0);
      remaining > 0;
      remaining--
    ) {
      const account = prng.weighted(accountKeys, (key) =>
        accountWeight(key, monthStart),
      );
      const payee = prng.weighted(spendingPayees, (p) => p.weight);
      const last = account === "oldCurrent" ? sweepDay : monthEnd;
      spend(
        account,
        payee,
        randomDay(monthStart, last < monthEnd ? last : monthEnd),
      );
    }

    // valuations at the end of the month, or today in the last one
    for (const account of SYNTHETIC_ACCOUNTS) {
      const previous = valuationState.get(account.key);
      if (previous === undefined || account.kind === "cash") continue;
      if (account.kind === "receivable") continue;
      let value = previous;
      for (const rule of SYNTHETIC_RULES) {
        if (rule.toAccount !== account.key) continue;
        const occurred = (occurrenceDays.get(rule.key) ?? []).filter(
          (day) => day >= monthStart && day <= monthEnd,
        ).length;
        value += occurred * minorOf(rule.amount);
      }
      if (account.monthlyContribution && parseDay(monthEnd).dayOfMonth >= 25) {
        value += minorOf(account.monthlyContribution);
      }
      if (account.growth) {
        value = Math.round(
          value *
            (1 + account.growth.mean + account.growth.spread * prng.normal()),
        );
      }
      valuationState.set(account.key, value);
      addValuation(account.key, monthEnd, value);
    }
  }

  // closing the old account: everything left moves to a live one
  const leftInOldAccount =
    (valuationState.get("oldCurrent") ?? 0) +
    (postedByAccount.get("oldCurrent") ?? 0);
  if (leftInOldAccount > 0) {
    add({
      kind: "transfer",
      date: sweepDay,
      amountMinor: 0,
      categoryId: null,
      memberId: memberIds.alex,
      note: "Close account",
      entries: [
        { account: "oldCurrent", amountMinor: -leftInOldAccount },
        { account: "alexCurrent", amountMinor: leftInOldAccount },
      ],
    });
  }

  // bank rows that wait for a human, and rows that are still expected
  const reviewFrom = (() => {
    const earliest = addDays(today, -(REVIEW_WINDOW_DAYS - 1));
    const monthFirst = startOfMonth(today);
    return earliest > monthFirst ? earliest : monthFirst;
  })();
  for (const row of REVIEW_ROWS) {
    const kind = row.pounds > 0 ? "income" : "expense";
    const amountMinor = minorOf(row.pounds);
    add({
      kind,
      date: randomDay(reviewFrom, today),
      amountMinor,
      categoryId: row.category ? categoryId(row.category) : uncategorised[kind],
      payeeId: row.payee ? payeeId(row.payee) : null,
      memberId: memberOf(accountSpec(row.account).owner),
      note: row.text,
      source: "bank",
      needsReview: true,
      aiConfidence: row.confidence,
      entries: [{ account: row.account, amountMinor }],
    });
  }
  for (const row of EXPECTED_ROWS) {
    const payee = payeeByName.get(row.payee);
    if (!payee) throw new Error(`Unknown synthetic payee ${row.payee}`);
    add({
      kind: "expense",
      status: "expected",
      date: addDays(today, row.inDays),
      amountMinor: -minorOf(row.pounds),
      categoryId: categoryId(payee.category),
      payeeId: payeeId(payee.name),
      memberId: memberOf(accountSpec(row.account).owner),
      note: "Booked",
      entries: [{ account: row.account, amountMinor: -minorOf(row.pounds) }],
    });
  }

  // exchange rates: one a week, a random walk around 0.78
  const fxRows: SyntheticRows["fxRates"] = [];
  let rate = 0.78;
  for (
    let on = startOfWeek(addDays(openingDay, -7));
    on <= today;
    on = addDays(on, 7)
  ) {
    rate = clamp(rate + 0.006 * prng.normal(), 0.68, 0.88);
    fxRows.push({
      householdId,
      base: "USD",
      quote: "GBP",
      on,
      rate: Number(rate.toFixed(6)),
      source: "manual",
      version,
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
    payeeAliases: aliasRows,
    tags: tagRows,
    rules: ruleRows,
    valuations: valuationRows,
    transactions: transactionRows,
    entries: entryRows,
    transactionTags: transactionTagRows,
    fxRates: fxRows,
  };
}

function ruleEntries(spec: SyntheticRule, amountMinor: number) {
  if (spec.kind === "income") {
    return [{ account: spec.account, amountMinor }];
  }
  if (spec.kind === "expense") {
    return [{ account: spec.account, amountMinor: -amountMinor }];
  }
  const to = spec.toAccount;
  if (!to) throw new Error(`Rule ${spec.key} is a transfer without a target`);
  return [
    { account: spec.account, amountMinor: -amountMinor },
    { account: to, amountMinor },
  ];
}
