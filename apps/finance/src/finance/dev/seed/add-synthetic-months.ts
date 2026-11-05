import { addDays, daysBetween } from "../../domain/dates/add-days.ts";
import { addMonths } from "../../domain/dates/add-months.ts";
import { endOfMonth } from "../../domain/dates/start-of-month.ts";
import { daysInMonth, parseDay } from "../../domain/dates/to-epoch-day.ts";
import { minorOf, type SyntheticContext } from "./create-synthetic-context.ts";
import { monthKey, type SyntheticLedger } from "./create-synthetic-ledger.ts";
import {
  SYNTHETIC_ACCOUNTS,
  type SyntheticAccount,
} from "./synthetic-accounts.ts";
import { SYNTHETIC_PAYEES, type SyntheticPayee } from "./synthetic-payees.ts";
import { SYNTHETIC_RULES } from "./synthetic-rules.ts";

const CARD_REPAYMENT_DAY = 5;
const RETAIL_PURCHASES_PER_REFUND = 12;
const RECENT_BANK_DAYS = 90;

const SPENDING_ACCOUNT_WEIGHTS: Record<string, number> = {
  visa: 0.27,
  mastercard: 0.22,
  amex: 0.12,
  alexCurrent: 0.13,
  samCurrent: 0.12,
  oldCurrent: 0.03,
};

const NOTES = ["Split bill", "Birthday", "Weekend away", "Work lunch"];

const BANK_REASONS = [
  "Past {payee} transactions use this category.",
  "A member labelled earlier {payee} rows this way.",
  "Same merchant as recent {payee} transactions.",
];

export function addSyntheticMonths(
  {
    prng,
    today,
    memberIds,
    memberOf,
    randomMember,
    randomDay,
    categoryId,
    tagId,
    payeeByName,
    payeeId,
    accountSpec,
  }: SyntheticContext,
  {
    valuationState,
    countByMonth,
    chargedIn,
    add,
    addValuation,
  }: SyntheticLedger,
  {
    months,
    amountScale,
    sweepDay,
    transactionsPerYear,
    occurrenceDays,
  }: {
    months: readonly string[];
    amountScale: number;
    sweepDay: string;
    transactionsPerYear: number;
    occurrenceDays: ReadonlyMap<string, string[]>;
  },
) {
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
      categoryId: categoryId(payee.category),
      payeeId: payeeId(payee.name),
      memberId: member,
      note: bank
        ? (payee.bankText ?? "")
        : prng.chance(0.06)
          ? prng.pick(NOTES)
          : "",
      source: bank ? "bank" : "manual",
      labelledBy: bank ? "ai" : "member",
      aiReason: bank
        ? prng.pick(BANK_REASONS).replace("{payee}", payee.name)
        : null,
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
}
