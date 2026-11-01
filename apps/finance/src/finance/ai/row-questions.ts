import {
  choice,
  noul,
  type ChoiceQuestion,
  type ChoiceResponse,
  type ContentValue,
  type EntryType,
  type NoulQuestion,
  type Questions,
} from "@typesafe-ai/sdk";
import type { FoundTransaction } from "../db/repositories/transaction-search-repository.ts";
import { categoryAncestry } from "../domain/category-ancestry.ts";
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { payeeNameKey } from "../domain/payees/payee-name-key.ts";
import { payeeNameCandidates } from "./payee-name-candidates.ts";
import type {
  LabellingAccount,
  LabellingContext,
  RowToLabel,
} from "./types.ts";

/** A Choice question can have at most this many options. */
const MAX_OPTIONS = 255;
const MAX_KNOWN_PAYEES = 150;
const MAX_TAGS = 50;
const MAX_PAIR_DAYS = 5;

/** The labels of the options that mean "nothing fits". */
export const NO_PAYEE = "no payee";
export const UNKNOWN_ACCOUNT = "unknown account";
export const NO_LOAN = "none";
export const UNKNOWN_MEMBER = "unknown";

/** The label of a new Payee name cut from the bank text. */
export function newPayeeLabel(name: string) {
  return `${name} (new payee)`;
}

/** The label of another bank row of the batch that is the other side of a transfer. */
export function pairLabel(accountName: string, date: string) {
  return `bank row on ${accountName}, ${date}`;
}

/** What the questions call the thing they ask about, its text, and the past Transactions like it. */
export interface Subject {
  /** Its path in the state, in backticks. */
  name: string;
  text: string;
  past: string;
}

export const BANK_ROW: Subject = {
  name: "`bank_row`",
  text: "the bank text",
  past: "past_transactions_with_similar_bank_text",
};

/** The question whether a Tag applies. */
export function tagInstructions(tagName: string, subject = BANK_ROW) {
  return `Does the tag "${tagName}" apply to ${subject.name}? Yes only when the household's instructions or past transactions like it say so.`;
}

export type Kind = "expense" | "income" | "transfer";

export type TransferTarget =
  | { type: "account"; accountId: string }
  | { type: "pair"; ref: string }
  | { type: "unknown" };

export type PayeeChoice = { id: string } | { name: string } | null;

/** A Choice question, and what each of its labels stands for. */
export interface Options<Value> {
  question: ChoiceQuestion;
  values: ReadonlyMap<string, Value>;
  /** Labels that lead to the same outcome share a key, so their probabilities add up. */
  outcomes: ReadonlyMap<string, string>;
}

export interface Option<Value> {
  label: string;
  description: EntryType;
  value: Value;
  /** Defaults to the value. */
  outcome?: string;
}

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

export interface TagQuestion {
  tagId: string;
  question: NoulQuestion;
}

/** What the questions of every bank row of one Household share. */
export interface HouseholdQuestions {
  context: LabellingContext;
  subject: Subject;
  pathOf: (categoryId: string) => string;
  accounts: ReadonlyMap<string, LabellingAccount>;
  described: ReadonlyMap<string, Record<string, ContentValue>>;
  accountList: Record<string, ContentValue>[];
  payeeKeys: ReadonlyMap<string, string>;
  expenseCategory?: Options<string>;
  incomeCategory?: Options<string>;
  member?: Options<string | null>;
  tags: readonly TagQuestion[];
}

/** The probability of every label that leads to the same outcome as the chosen one. */
export function outcomeProbability(
  options: Options<unknown>,
  answer: ChoiceResponse,
) {
  const outcome = options.outcomes.get(answer.choice);
  let probability = 0;
  for (const [label, each] of options.outcomes) {
    if (each === outcome) probability += answer.probabilities[label] ?? 0;
  }
  return probability;
}

export function optionsOf<Value>(
  instructions: string,
  options: readonly Option<Value>[],
): Options<Value> {
  const criteria: Record<string, EntryType> = {};
  const values = new Map<string, Value>();
  const outcomes = new Map<string, string>();
  for (const option of options.slice(0, MAX_OPTIONS)) {
    let label = option.label.trim() || "?";
    for (let n = 2; values.has(label); n++) {
      label = `${option.label} (${String(n)})`;
    }
    criteria[label] = option.description;
    values.set(label, option.value);
    outcomes.set(label, option.outcome ?? JSON.stringify(option.value));
  }
  return { question: choice(instructions, criteria), values, outcomes };
}

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

function amountOf(amountMinor: number, currency: string) {
  return `${minorUnitsToDecimalString(amountMinor, currency)} ${currency}`;
}

function describeAccounts(
  context: LabellingContext,
  names: ReadonlyMap<string, string>,
) {
  const members = new Map(context.members.map((each) => [each.id, each.name]));
  return new Map(
    context.accounts.map((account): [string, Record<string, ContentValue>] => [
      account.id,
      {
        name: account.name,
        kind: account.kind,
        currency: account.currency,
        ...(account.institution ? { institution: account.institution } : {}),
        owner: members.get(account.ownerMemberId ?? "") ?? "shared",
        bank_rows: account.linked
          ? "its own bank rows arrive too"
          : "not linked to a bank",
        ...(account.closed ? { closed: true } : {}),
        ...(account.defaultPaymentAccountId
          ? { paid_from: names.get(account.defaultPaymentAccountId) ?? "?" }
          : {}),
        ...(account.paymentDueDay === null
          ? {}
          : { payment_due_day: account.paymentDueDay }),
      },
    ]),
  );
}

function listAccounts(
  context: LabellingContext,
  names: ReadonlyMap<string, string>,
): Record<string, ContentValue>[] {
  return context.accounts
    .filter((each) => !each.isSystem)
    .map((each) => ({
      name: each.name,
      kind: each.kind,
      ...(each.institution ? { institution: each.institution } : {}),
      ...(each.defaultPaymentAccountId
        ? { paid_from: names.get(each.defaultPaymentAccountId) ?? "?" }
        : {}),
    }));
}

export function describePast(
  found: FoundTransaction,
  pathOf: (id: string) => string,
): Record<string, ContentValue> {
  return {
    date: found.date,
    bank_text: found.bankTexts.join(" / ") || "-",
    kind: found.kind,
    entries: found.entries.map(
      (entry) =>
        `${entry.accountName}: ${amountOf(entry.amountMinor, entry.currency)}`,
    ),
    labelled_by:
      found.labelledBy === "member"
        ? "a member"
        : "the AI, and no member changed it",
    payee: found.payeeName ?? "none",
    ...(found.categoryId ? { category: pathOf(found.categoryId) } : {}),
    ...(found.tagNames.length > 0 ? { tags: found.tagNames } : {}),
    ...(found.memberName ? { member: found.memberName } : {}),
    ...(found.note ? { note: found.note } : {}),
  };
}

export function evidenceOf(subject: Subject) {
  return `\`household_instructions\` override everything. Next, copy \`${subject.past}\`: a member's label beats the AI's, and a recent label beats an old one. Use common knowledge only when neither decides.`;
}

function categoryOptions(
  context: LabellingContext,
  subject: Subject,
  pathOf: (categoryId: string) => string,
  kind: "expense" | "income",
) {
  const ofKind = context.categories.filter(
    (category) => category.kind === kind,
  );
  const usable = ofKind.filter((category) => !category.isSystem);
  const categories = usable.length > 0 ? usable : ofKind;
  if (categories.length === 0) return undefined;
  const premise =
    kind === "expense"
      ? `Suppose ${subject.name} is an expense, or the refund of one.`
      : `Suppose ${subject.name} is an income.`;
  return optionsOf(
    `${premise} Which of the household's ${kind} categories does it belong to? ${evidenceOf(subject)}`,
    categories.map((category) => ({
      label: pathOf(category.id),
      description:
        category.usualPayees.length > 0
          ? `Usual payees: ${category.usualPayees.join(", ")}`
          : null,
      value: category.id,
    })),
  );
}

function memberOptions(context: LabellingContext, subject: Subject) {
  if (context.members.length < 2) return undefined;
  return optionsOf(
    `Whose transaction is ${subject.name}? Choose a member only when the household's instructions or past transactions like it show it.`,
    [
      ...context.members.map((member) => ({
        label: member.name,
        description: "A member of the household",
        value: member.id,
      })),
      {
        label: UNKNOWN_MEMBER,
        description: "Nothing shows whose it is",
        value: null,
      },
    ],
  );
}

/** Builds once per Household what the questions of each of its bank rows share. */
export function householdQuestions(
  context: LabellingContext,
  subject = BANK_ROW,
): HouseholdQuestions {
  const categories = new Map(
    context.categories.map((category) => [category.id, category]),
  );
  const paths = new Map(
    context.categories.map((category) => [
      category.id,
      categoryAncestry(category.id, categories)
        .map((each) => each.name)
        .join(" > "),
    ]),
  );
  const pathOf = (categoryId: string) => paths.get(categoryId) ?? "?";
  const accountNames = new Map(
    context.accounts.map((each) => [each.id, each.name]),
  );
  return {
    context,
    subject,
    pathOf,
    accounts: new Map(context.accounts.map((each) => [each.id, each])),
    described: describeAccounts(context, accountNames),
    accountList: listAccounts(context, accountNames),
    payeeKeys: new Map(
      context.payees.map((payee) => [payee.id, payeeNameKey(payee.name)]),
    ),
    expenseCategory: categoryOptions(context, subject, pathOf, "expense"),
    incomeCategory: categoryOptions(context, subject, pathOf, "income"),
    member: memberOptions(context, subject),
    tags: context.tags.slice(0, MAX_TAGS).map((tag) => ({
      tagId: tag.id,
      question: noul(tagInstructions(tag.name, subject)),
    })),
  };
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
