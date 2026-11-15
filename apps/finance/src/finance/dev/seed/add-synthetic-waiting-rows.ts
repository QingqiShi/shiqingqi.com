import { addDays } from "../../domain/dates/add-days.ts";
import { startOfMonth } from "../../domain/dates/start-of-month.ts";
import { minorOf, type SyntheticContext } from "./create-synthetic-context.ts";
import type { SyntheticLedger } from "./create-synthetic-ledger.ts";

const REVIEW_WINDOW_DAYS = 8;

const REVIEW_ROWS = [
  {
    account: "alexCurrent",
    text: "CARD PAYMENT TO STRATFORD CAFE 8841",
    pounds: -14.2,
    category: null,
    payee: null,
    reason: null,
  },
  {
    account: "alexCurrent",
    text: "DIRECT DEBIT UNKNOWN LTD REF 2291",
    pounds: -86,
    category: "household",
    payee: null,
    reason:
      "Unsure of the kind: expense 59%, transfer 41%; Unsure of the category: Home > Household 47%, Bills > Utilities 31%",
  },
  {
    account: "mastercard",
    text: "PAYPAL *MARKETPLACE 35314369001",
    pounds: -23.99,
    category: "online",
    payee: null,
    reason: "PayPal hides the seller. Check the category.",
  },
  {
    account: "samCurrent",
    text: "FASTER PAYMENT REF 5521 FRIEND",
    pounds: 120,
    category: null,
    payee: null,
    reason: null,
  },
  {
    account: "visa",
    text: "TESCO STORES 3214",
    pounds: -31.45,
    category: "grocery",
    payee: "Tesco",
    reason: "Unsure of the category: Food > Groceries 55%, Food > Takeaway 33%",
  },
] as const;

/** A transfer the labeller was unsure of: which account the money went to. */
const REVIEW_TRANSFER = {
  from: "alexCurrent",
  to: "savings",
  text: "ROUND UP TO SAVINGS",
  pounds: 0.85,
  reason: "Unsure of the other side: Rainy Day Savings 55%, Sam Current 38%",
} as const;

const EXPECTED_ROWS = [
  { account: "alexCurrent", payee: "Smile Dental", pounds: 85, inDays: 3 },
  { account: "visa", payee: "Trainline", pounds: 42, inDays: 5 },
  { account: "amex", payee: "Ocado", pounds: 110, inDays: 1 },
] as const;

export function addSyntheticWaitingRows(
  {
    today,
    memberOf,
    randomDay,
    categoryId,
    uncategorised,
    payeeByName,
    payeeId,
    accountSpec,
  }: SyntheticContext,
  { add }: SyntheticLedger,
) {
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
      categoryId: row.category ? categoryId(row.category) : uncategorised[kind],
      payeeId: row.payee ? payeeId(row.payee) : null,
      memberId: memberOf(accountSpec(row.account).owner),
      note: row.text,
      source: "bank",
      needsReview: true,
      labelledBy: "ai",
      aiReason: row.reason,
      entries: [{ account: row.account, amountMinor }],
    });
  }
  add({
    kind: "transfer",
    date: randomDay(reviewFrom, today),
    categoryId: null,
    memberId: memberOf(accountSpec(REVIEW_TRANSFER.from).owner),
    note: REVIEW_TRANSFER.text,
    source: "bank",
    needsReview: true,
    labelledBy: "ai",
    aiReason: REVIEW_TRANSFER.reason,
    entries: [
      {
        account: REVIEW_TRANSFER.from,
        amountMinor: -minorOf(REVIEW_TRANSFER.pounds),
      },
      {
        account: REVIEW_TRANSFER.to,
        amountMinor: minorOf(REVIEW_TRANSFER.pounds),
      },
    ],
  });
  for (const row of EXPECTED_ROWS) {
    const payee = payeeByName.get(row.payee);
    if (!payee) throw new Error(`Unknown synthetic payee ${row.payee}`);
    add({
      kind: "expense",
      status: "expected",
      date: addDays(today, row.inDays),
      categoryId: categoryId(payee.category),
      payeeId: payeeId(payee.name),
      memberId: memberOf(accountSpec(row.account).owner),
      note: "Booked",
      entries: [{ account: row.account, amountMinor: -minorOf(row.pounds) }],
    });
  }
}
