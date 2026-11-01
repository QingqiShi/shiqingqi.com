import type { ContentValue } from "@typesafe-ai/sdk";
import type { FoundTransaction } from "../db/repositories/transaction-search-repository.ts";
import type { QuickAddCandidates } from "./quick-add-candidates.ts";
import {
  dayOf,
  describePast,
  evidenceOf,
  kindOptions,
  optionsOf,
  payeeOptions,
  paysDownOptions,
  type HouseholdQuestions,
  type Kind,
  type Options,
  type PayeeChoice,
  type Subject,
} from "./row-questions.ts";

/** What the quick-add questions call the line a Member typed or pasted. */
export const NEW_TRANSACTION: Subject = {
  name: "`new_transaction`",
  text: "the member's text",
  past: "past_transactions_with_similar_text",
};

/** The Choice questions about one quick-add line, by their names in the request. */
export type QuickAddChoices = {
  kind: Options<Kind>;
  /** Only when the text has more than one amount. */
  amount?: Options<number>;
  /** Only when the text names a day other than today. */
  date?: Options<string>;
  /** The account of an expense or an income. */
  account?: Options<string>;
  expenseCategory?: Options<string>;
  incomeCategory?: Options<string>;
  payee: Options<PayeeChoice>;
  paysDown?: Options<string | null>;
  /** The account a transfer leaves. */
  fromAccount?: Options<string>;
  /** The account a transfer arrives in. */
  toAccount?: Options<string>;
  member?: Options<string | null>;
};

/** What Jev reads about one quick-add line. */
export function quickAddState(
  household: HouseholdQuestions,
  text: string,
  today: string,
  past: readonly FoundTransaction[],
): Record<string, ContentValue> {
  return {
    household_instructions:
      household.context.instructions.trim() || "(the household wrote none)",
    new_transaction: {
      text,
      written_on: dayOf(today),
      written_by: "a member of the household, who typed or pasted it",
    },
    household_accounts: household.accountList,
    [NEW_TRANSACTION.past]:
      past.length > 0
        ? past.map((found) => describePast(found, household.pathOf))
        : "none found",
  };
}

function accountOptions(
  household: HouseholdQuestions,
  instructions: string,
): Options<string> | undefined {
  const accounts = household.context.accounts.filter(
    (account) => !account.isSystem && !account.closed,
  );
  if (accounts.length === 0) return undefined;
  return optionsOf(
    `${instructions} ${evidenceOf(NEW_TRANSACTION)}`,
    accounts.map((account) => ({
      label: account.name,
      description: household.described.get(account.id) ?? null,
      value: account.id,
    })),
  );
}

/**
 * The Choice questions about one quick-add line. Like the questions about a
 * bank row, each question that depends on the kind says which kind it
 * supposes, so that all of them go in one request.
 */
export function quickAddQuestions(
  household: HouseholdQuestions,
  text: string,
  candidates: QuickAddCandidates,
  past: readonly FoundTransaction[],
): QuickAddChoices {
  const { amounts, dates, payeeNames } = candidates;
  return {
    kind: kindOptions(household, true),
    amount:
      amounts.length > 1
        ? optionsOf(
            "Which number in `new_transaction.text` is the amount of money of the transaction?",
            amounts.map((amount) => ({
              label: amount.written,
              description: null,
              value: amount.amountMinor,
            })),
          )
        : undefined,
    date:
      dates.length > 1
        ? optionsOf(
            "On which day did `new_transaction` happen?",
            dates.map((date) => ({
              label: dayOf(date.date),
              description:
                date.written === null
                  ? "The day the member wrote it"
                  : `The day "${date.written}" in the text means`,
              value: date.date,
            })),
          )
        : undefined,
    account: accountOptions(
      household,
      "Suppose `new_transaction` is an expense or an income. Which of the household's accounts did its money leave or arrive in?",
    ),
    expenseCategory: household.expenseCategory,
    incomeCategory: household.incomeCategory,
    payee: payeeOptions(household, text, payeeNames, past),
    paysDown: paysDownOptions(household, null, household.context.baseCurrency),
    fromAccount: accountOptions(
      household,
      "Suppose `new_transaction` is a transfer between two of the household's own accounts. Which account did the money leave?",
    ),
    toAccount: accountOptions(
      household,
      "Suppose `new_transaction` is a transfer between two of the household's own accounts. Which account did the money arrive in?",
    ),
    member: household.member,
  };
}
