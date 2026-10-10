import { comparableText } from "./comparable-text.ts";
import { scoreTextSimilarity } from "./score-text-similarity.ts";
import type { LabelInput, LabelMemory, MemoryTransaction } from "./types.ts";

const MIN_SCORE = 0.3;
const PER_PAYEE = 3;
const AMOUNT_BAND = 0.2;

function inAmountBand(a: number, b: number) {
  const low = Math.abs(a) * (1 - AMOUNT_BAND);
  const high = Math.abs(a) * (1 + AMOUNT_BAND);
  return Math.abs(b) >= low && Math.abs(b) <= high;
}

/**
 * Past Transactions that help the model label `inputs`: first those of the
 * Payees whose names are most alike, then those on the same account with a
 * near amount. Newest first within each group, at most `limit`.
 */
export function findSimilarTransactions(
  inputs: readonly LabelInput[],
  memory: Pick<LabelMemory, "payees" | "aliases" | "transactions">,
  limit = 30,
): MemoryTransaction[] {
  const payeeScores = new Map<string, number>();
  const texts = [
    ...memory.payees.map((payee) => ({ payeeId: payee.id, text: payee.name })),
    ...memory.aliases.map((alias) => ({
      payeeId: alias.payeeId,
      text: alias.alias,
    })),
  ].map(({ payeeId, text }) => ({ payeeId, text: comparableText(text) }));
  for (const input of inputs) {
    const inputText = comparableText(input.text);
    for (const candidate of texts) {
      const score = scoreTextSimilarity(inputText, candidate.text);
      if (score >= MIN_SCORE) {
        payeeScores.set(
          candidate.payeeId,
          Math.max(score, payeeScores.get(candidate.payeeId) ?? 0),
        );
      }
    }
  }

  const chosen = new Map<string, MemoryTransaction>();
  const byScore = [...payeeScores].sort((a, b) => b[1] - a[1]);
  for (const [payeeId] of byScore) {
    let taken = 0;
    for (const transaction of memory.transactions) {
      if (chosen.size >= limit || taken >= PER_PAYEE) break;
      if (transaction.payeeId !== payeeId) continue;
      chosen.set(transaction.id, transaction);
      taken++;
    }
  }

  for (const input of inputs) {
    for (const transaction of memory.transactions) {
      if (chosen.size >= limit) break;
      if (
        transaction.kind !== "transfer" &&
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
