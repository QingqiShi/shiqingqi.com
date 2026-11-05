import { noul, type ContentValue, type NoulQuestion } from "@typesafe-ai/sdk";
import type { FoundTransaction } from "../db/repositories/transaction-search-repository.ts";
import { categoryAncestry } from "../domain/category-ancestry.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { payeeNameKey } from "../domain/payees/payee-name-key.ts";
import { optionsOf, type Options } from "./options-of.ts";
import type { LabellingAccount, LabellingContext } from "./types.ts";

const MAX_TAGS = 50;

/** The labels of the options that mean "nothing fits". */
export const NO_PAYEE = "no payee";
export const UNKNOWN_ACCOUNT = "unknown account";
export const NO_LOAN = "none";
export const UNKNOWN_MEMBER = "unknown";

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

export function amountOf(amountMinor: number, currency: string) {
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
