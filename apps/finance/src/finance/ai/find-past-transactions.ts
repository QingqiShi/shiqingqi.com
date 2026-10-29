import type {
  FoundTransaction,
  TransactionSearch,
} from "../db/repositories/transaction-search-repository.ts";
import { BANK_TEXT_NOISE } from "./payee-name-candidates.ts";
import type { RowToLabel } from "./types.ts";

export type SearchTransactions = (
  search: TransactionSearch,
) => Promise<FoundTransaction[]>;

const MAX_PAST = 8;
const MAX_WORDS = 3;

/** The distinctive words of a bank row, in the order the bank wrote them. */
function searchWordsOf(row: Pick<RowToLabel, "merchant" | "description">) {
  const words = `${row.merchant} ${row.description}`
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 3 && !BANK_TEXT_NOISE.has(word));
  return [...new Set(words)].slice(0, MAX_WORDS);
}

/** Past Transactions with the same key repeat each other. */
function repeatKeyOf(transaction: FoundTransaction) {
  return JSON.stringify([
    transaction.bankTexts,
    transaction.categoryId,
    transaction.tagNames,
    transaction.payeeId,
    transaction.memberName,
    transaction.note,
  ]);
}

/**
 * Up to 8 of the Household's past Transactions with bank text like the
 * row's: first those with its first two distinctive words together, then
 * those with any one of them, each group newest first. Of Transactions
 * that repeat each other, only the newest stays.
 */
export async function findPastTransactions(
  search: SearchTransactions,
  row: RowToLabel,
): Promise<FoundTransaction[]> {
  const words = searchWordsOf(row);
  if (words.length === 0) return [];
  const texts = [
    ...(words.length > 1 ? [words.slice(0, 2).join(" ")] : []),
    ...words,
  ];
  const results = await Promise.all(
    texts.map((text) => search({ text, limit: MAX_PAST })),
  );
  const found = new Map(
    results.flat().map((transaction) => [transaction.id, transaction]),
  );
  const newest = new Map<string, FoundTransaction>();
  for (const transaction of found.values()) {
    const key = repeatKeyOf(transaction);
    const kept = newest.get(key);
    if (!kept || transaction.date > kept.date) newest.set(key, transaction);
  }
  return [...found.values()]
    .filter(
      (transaction) => newest.get(repeatKeyOf(transaction)) === transaction,
    )
    .slice(0, MAX_PAST);
}
