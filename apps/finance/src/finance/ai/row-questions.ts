import { type ContentValue, type Questions } from "@typesafe-ai/sdk";
import type { FoundTransaction } from "../db/repositories/transaction-search-repository.ts";
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { payeeNameKey } from "../domain/payees/payee-name-key.ts";
import {
  amountOf,
  BANK_ROW,
  describePast,
  evidenceOf,
  NO_LOAN,
  NO_PAYEE,
  UNKNOWN_ACCOUNT,
  type HouseholdQuestions,
  type TagQuestion,
} from "./household-questions.ts";
import { optionsOf, type Option, type Options } from "./options-of.ts";
import { payeeNameCandidates } from "./payee-name-candidates.ts";
import type { LabellingContext, RowToLabel } from "./types.ts";

const MAX_KNOWN_PAYEES = 150;

const MAX_PAIR_DAYS = 5;

/** The label of a new Payee name cut from the bank text. */
export function newPayeeLabel(name: string) {
  return `${name} (new payee)`;
}

/** The label of another bank row of the batch that is the other side of a transfer. */
export function pairLabel(accountName: string, date: string) {
  return `bank row on ${accountName}, ${date}`;
}

export type Kind = "expense" | "income" | "transfer";

export type TransferTarget =
  | { type: "account"; accountId: string }
  | { type: "pair"; ref: string }
  | { type: "unknown" };

export type PayeeChoice = { id: string } | { name: string } | null;

/** The Choice questions about one bank row, by their names in the request. */
export type RowChoices = {
  kind: Options<Kind>;
  expenseCategory?: Options<string>;
  incomeCategory?: Options<string>;
  payee: Options<PayeeChoice>;
  transfer: Options<TransferTarget>;
  paysDown?: Options<string | null>;
  member?: Options<string | null>;
};

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** "2026-03-12 (Thursday)". */
export function dayOf(date: string) {
  return `${date} (${WEEKDAYS[weekdayOf(date) - 1]})`;
}

/** What Jev reads about one bank row. */
export function rowState(
  household: HouseholdQuestions,
  row: RowToLabel,
  past: readonly FoundTransaction[],
): Record<string, ContentValue> {
  const { context } = household;
  const account = household.accounts.get(row.accountId);
  const currency = account?.currency ?? context.baseCurrency;
  return {
    household_instructions:
      context.instructions.trim() || "(the household wrote none)",
    bank_row: {
      date: dayOf(row.date),
      amount: amountOf(row.amountMinor, currency),
      direction: row.amountMinor < 0 ? "money out" : "money in",
      account: household.described.get(row.accountId) ?? "?",
      merchant: row.merchant || "-",
      description: row.description || "-",
    },
    household_accounts: household.accountList,
    past_transactions_with_similar_bank_text:
      past.length > 0
        ? past.map((found) => describePast(found, household.pathOf))
        : "none found",
  };
}

/** Who is on the other side of the money; `withIncome` is false when the money left the household. */
export function kindOptions(
  household: HouseholdQuestions,
  withIncome: boolean,
) {
  const options: Option<Kind>[] = [
    {
      label: "expense",
      description:
        "Someone outside the household, whom the household pays or who refunds the household",
      value: "expense",
    },
  ];
  if (withIncome) {
    options.push({
      label: "income",
      description:
        "Someone outside the household, who pays the household for anything but a refund",
      value: "income",
    });
  }
  options.push({
    label: "transfer",
    description: "An account in `household_accounts`",
    value: "transfer",
  });
  return optionsOf(
    `Who is on the other side of the money in ${household.subject.name}? ${evidenceOf(household.subject)}`,
    options,
  );
}

/** Known Payees, those that `text` or its past Transactions name first, then the new names cut from `text`. */
export function payeeOptions(
  household: HouseholdQuestions,
  text: string,
  newNames: readonly string[],
  past: readonly FoundTransaction[],
) {
  const { context, subject, pathOf, payeeKeys } = household;
  const newKeys = new Set(newNames.map(payeeNameKey));
  const bankKey = payeeNameKey(text);
  const pastIds = new Set(past.flatMap((found) => found.payeeId ?? []));
  const named = (payee: { id: string }) => {
    const key = payeeKeys.get(payee.id) ?? "";
    return key.length >= 3 && (newKeys.has(key) || bankKey.includes(key));
  };
  const known = new Map<string, LabellingContext["payees"][number]>();
  for (const payee of [
    ...context.payees.filter((each) => pastIds.has(each.id)),
    ...context.payees.filter(named),
    ...context.payees,
  ]) {
    if (known.size >= MAX_KNOWN_PAYEES) break;
    known.set(payee.id, payee);
  }
  const knownKeys = new Set(
    [...known.keys()].map((id) => payeeKeys.get(id) ?? ""),
  );
  const namedKeys = [...known.values()]
    .filter(named)
    .map((payee) => payeeKeys.get(payee.id) ?? "");
  const isKnown = (name: string) => {
    const key = payeeNameKey(name);
    return knownKeys.has(key) || namedKeys.some((each) => key.includes(each));
  };
  const options: Option<PayeeChoice>[] = [...known.values()].map((payee) => ({
    label: payee.name,
    description: payee.defaultCategoryId
      ? `A payee the household already has; usually ${pathOf(payee.defaultCategoryId)}`
      : "A payee the household already has",
    value: { id: payee.id },
  }));
  for (const name of newNames) {
    if (isKnown(name)) continue;
    options.push({
      label: newPayeeLabel(name),
      description: `A new payee, named from ${subject.text}`,
      value: { name },
      outcome: "new payee",
    });
  }
  options.push({
    label: NO_PAYEE,
    description: `${capitalise(subject.text)} names no merchant or person`,
    value: null,
  });
  return optionsOf(
    `Who is the payee of ${subject.name}: the merchant or person on the other side of the money? When the household already has that payee, choose it, however ${subject.text} writes its name. Else choose the new payee with the shortest full name of that merchant or person. When a platform takes the payment for a seller, the payee is the platform. ${evidenceOf(subject)}`,
    options,
  );
}

/** The other bank rows of the batch that can be the other side of a transfer. */
function pairsOf(
  household: HouseholdQuestions,
  row: RowToLabel,
  batch: readonly RowToLabel[],
) {
  const own = household.accounts.get(row.accountId);
  return batch.filter((other) => {
    const account = household.accounts.get(other.accountId);
    return (
      other.ref !== row.ref &&
      account !== undefined &&
      other.accountId !== row.accountId &&
      Math.sign(other.amountMinor) === -Math.sign(row.amountMinor) &&
      Math.abs(toEpochDay(other.date) - toEpochDay(row.date)) <=
        MAX_PAIR_DAYS &&
      (account.currency !== own?.currency ||
        other.amountMinor === -row.amountMinor)
    );
  });
}

function transferOptions(
  household: HouseholdQuestions,
  row: RowToLabel,
  batch: readonly RowToLabel[],
) {
  const pairs = pairsOf(household, row, batch);
  const options: Option<TransferTarget>[] = pairs.map((other) => {
    const account = household.accounts.get(other.accountId);
    const currency = account?.currency ?? household.context.baseCurrency;
    return {
      label: pairLabel(account?.name ?? "?", other.date),
      description: {
        about: "A bank row that arrived with this one",
        account: account?.name ?? "?",
        date: other.date,
        amount: amountOf(other.amountMinor, currency),
        bank_text:
          [other.merchant, other.description].filter(Boolean).join(" | ") ||
          "-",
      },
      value: { type: "pair", ref: other.ref },
    };
  });
  for (const account of household.context.accounts) {
    if (account.isSystem || account.id === row.accountId) continue;
    const onAccount = pairs.filter((other) => other.accountId === account.id);
    options.push({
      label: account.name,
      description: {
        ...household.described.get(account.id),
        ...(account.defaultPaymentAccountId === row.accountId
          ? { note: "a card that this bank row's account pays off" }
          : {}),
      },
      value:
        onAccount.length === 1
          ? { type: "pair", ref: onAccount[0].ref }
          : { type: "account", accountId: account.id },
    });
  }
  options.push({
    label: UNKNOWN_ACCOUNT,
    description:
      "An account of the household that is not listed, or that the bank text does not identify",
    value: { type: "unknown" },
  });
  return optionsOf(
    `Suppose \`bank_row\` is a transfer between two of the household's own accounts. Which is the other side? When a bank row that arrived with it is the other side, choose that bank row. ${evidenceOf(BANK_ROW)}`,
    options,
  );
}

/** Loan and receivable accounts in `currency` that an expense or income on `accountId` can also change. */
export function paysDownOptions(
  household: HouseholdQuestions,
  accountId: string | null,
  currency: string | undefined,
) {
  const accounts = household.context.accounts.filter(
    (account) =>
      !account.isSystem &&
      account.id !== accountId &&
      (account.kind === "loan" || account.kind === "receivable") &&
      account.currency === currency,
  );
  if (accounts.length === 0) return undefined;
  return optionsOf(
    `Suppose ${household.subject.name} is an expense or an income. Does it also change the balance of one of these loan or receivable accounts? Choose an account only when the household's instructions say so or past transactions like it have an entry on it.`,
    [
      ...accounts.map((account) => ({
        label: account.name,
        description: household.described.get(account.id) ?? null,
        value: account.id,
      })),
      {
        label: NO_LOAN,
        description: "It changes none of them",
        value: null,
      },
    ],
  );
}

/**
 * The Choice questions about one bank row. Each question that depends on
 * the kind says which kind it supposes, so that all of them go in one
 * request; the labeller reads only the answers for the kind that wins.
 */
export function rowQuestions(
  household: HouseholdQuestions,
  row: RowToLabel,
  batch: readonly RowToLabel[],
  past: readonly FoundTransaction[],
): RowChoices {
  return {
    kind: kindOptions(household, row.amountMinor > 0),
    expenseCategory: household.expenseCategory,
    incomeCategory: row.amountMinor > 0 ? household.incomeCategory : undefined,
    payee: payeeOptions(
      household,
      `${row.merchant} ${row.description}`,
      payeeNameCandidates(row.merchant, row.description),
      past,
    ),
    transfer: transferOptions(household, row, batch),
    paysDown: paysDownOptions(
      household,
      row.accountId,
      household.accounts.get(row.accountId)?.currency,
    ),
    member: household.member,
  };
}

/** The questions as the request sends them, by name. A Tag's question is named by the Tag's id. */
export function requestQuestions(
  choices: Readonly<Record<string, Options<unknown> | undefined>>,
  tags: readonly TagQuestion[],
): Questions {
  const questions: Questions = {};
  for (const [name, options] of Object.entries<Options<unknown> | undefined>(
    choices,
  )) {
    if (options) questions[name] = options.question;
  }
  for (const tag of tags) questions[tag.tagId] = tag.question;
  return questions;
}
