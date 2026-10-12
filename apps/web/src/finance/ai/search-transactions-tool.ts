import { tool } from "ai";
import { z } from "zod";
import {
  SEARCH_LIMIT,
  type FoundTransaction,
  type TransactionSearch,
} from "../db/repositories/transaction-search-repository.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";

export type SearchTransactions = (
  search: TransactionSearch,
) => Promise<FoundTransaction[]>;

const day = z.iso.date();

const inputSchema = z.object({
  text: z
    .string()
    .max(200)
    .optional()
    .describe(
      "Words that must all appear in the bank text, the payee name or the note. Use one or two distinctive words of the merchant, not store numbers or towns.",
    ),
  accountId: z
    .string()
    .optional()
    .describe("Only transactions on this account."),
  amountMin: z
    .number()
    .nonnegative()
    .optional()
    .describe("The smallest absolute amount, in major units."),
  amountMax: z
    .number()
    .nonnegative()
    .optional()
    .describe("The largest absolute amount, in major units."),
  dateFrom: day.optional(),
  dateTo: day.optional(),
  kind: z.enum(["expense", "income", "transfer"]).optional(),
  limit: z.int().min(1).max(SEARCH_LIMIT.max).optional(),
});

function present(
  found: FoundTransaction,
  categoryPath: (id: string) => string,
) {
  return {
    date: found.date,
    kind: found.kind,
    entries: found.entries.map((entry) => ({
      accountId: entry.accountId,
      account: entry.accountName,
      amount: minorUnitsToDecimalString(entry.amountMinor, entry.currency),
      currency: entry.currency,
    })),
    bankText: found.bankTexts,
    payeeId: found.payeeId,
    payee: found.payeeName,
    categoryId: found.categoryId,
    category: found.categoryId ? categoryPath(found.categoryId) : null,
    tags: found.tagNames,
    member: found.memberName,
    note: found.note,
  };
}

/**
 * The one tool of the labeller: finds the Household's past Transactions that
 * a Member labelled.
 */
export function searchTransactionsTool(
  search: SearchTransactions,
  categoryPath: (id: string) => string,
) {
  return tool({
    description:
      "Search the household's past transactions that a member labelled, the newest first. Each result has the bank text, the entries (account and signed amount) and the labels.",
    inputSchema,
    execute: async (input) => {
      const found = await search(input);
      return found.map((row) => present(row, categoryPath));
    },
  });
}
