import { comparableText, type ComparableText } from "./comparable-text.ts";
import { bankTextHistory } from "./labels-for-bank-text.ts";
import { scoreTextSimilarity } from "./score-text-similarity.ts";
import type { LabelInput, LabelMemory, MemoryTransaction } from "./types.ts";

const MIN_SCORE = 0.3;
const PER_INPUT = 3;
const SAME_TEXT_PER_CATEGORY = 5;
const AMOUNT_BAND = 0.2;

type ExampleMemory = Pick<LabelMemory, "payees" | "transactions">;

interface Candidate {
  transaction: MemoryTransaction;
  texts: ComparableText[];
}

const candidatesByTransactions = new WeakMap<
  ExampleMemory["transactions"],
  Candidate[]
>();

/** The labelled Transactions with the bank texts and Payee name each is known by, prepared once for each memory. */
function candidatesOf(memory: ExampleMemory) {
  const cached = candidatesByTransactions.get(memory.transactions);
  if (cached) return cached;
  const payeeNames = new Map(
    memory.payees.map((payee) => [payee.id, payee.name]),
  );
  const candidates = memory.transactions
    .filter(
      (transaction) =>
        transaction.kind !== "transfer" && transaction.categoryId !== null,
    )
    .map((transaction) => {
      const payeeName = transaction.payeeId
        ? payeeNames.get(transaction.payeeId)
        : undefined;
      return {
        transaction,
        texts: [
          ...transaction.bankTexts,
          ...(payeeName ? [payeeName] : []),
        ].map((text) => comparableText(text)),
      };
    });
  candidatesByTransactions.set(memory.transactions, candidates);
  return candidates;
}

function inAmountBand(a: number, b: number) {
  const low = Math.abs(a) * (1 - AMOUNT_BAND);
  const high = Math.abs(a) * (1 + AMOUNT_BAND);
  return Math.abs(b) >= low && Math.abs(b) <= high;
}

/** For each Category, the newest Transactions with the same bank text and sign, so the model sees how they differ. */
function sameTextByCategory(input: LabelInput, memory: ExampleMemory) {
  const perCategory = new Map<string, number>();
  return bankTextHistory(input, memory).filter((transaction) => {
    const key = transaction.categoryId ?? "";
    const count = perCategory.get(key) ?? 0;
    perCategory.set(key, count + 1);
    return count < SAME_TEXT_PER_CATEGORY;
  });
}

/**
 * Past labelled Transactions that help the model label `inputs`: for each
 * input, the five newest with the same bank text of each Category; then the
 * three whose bank text or Payee name is most alike, newest first on a tie;
 * then one on the same account with a near amount. At most `limit`.
 */
export function findSimilarTransactions(
  inputs: readonly LabelInput[],
  memory: ExampleMemory,
  limit = 60,
): MemoryTransaction[] {
  const candidates = candidatesOf(memory);
  const chosen = new Map<string, MemoryTransaction>();

  for (const input of inputs) {
    for (const transaction of sameTextByCategory(input, memory)) {
      if (chosen.size >= limit) break;
      chosen.set(transaction.id, transaction);
    }
  }

  for (const input of inputs) {
    const inputText = comparableText(input.text);
    const scored = candidates
      .map((candidate) => ({
        transaction: candidate.transaction,
        score: Math.max(
          0,
          ...candidate.texts.map((text) =>
            scoreTextSimilarity(inputText, text),
          ),
        ),
      }))
      .filter((candidate) => candidate.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);
    for (const { transaction } of scored.slice(0, PER_INPUT)) {
      if (chosen.size >= limit) break;
      chosen.set(transaction.id, transaction);
    }
  }

  for (const input of inputs) {
    for (const { transaction } of candidates) {
      if (chosen.size >= limit) break;
      if (
        transaction.accountIds.includes(input.accountId) &&
        inAmountBand(input.amountMinor, transaction.amountMinor) &&
        !chosen.has(transaction.id)
      ) {
        chosen.set(transaction.id, transaction);
        break;
      }
    }
  }
  return [...chosen.values()];
}
