import { normaliseBankText } from "./normalise-bank-text.ts";
import type { LabelMemory } from "./types.ts";

/** The memory as it will be once these bank rows match their Transactions. */
export function withBankTexts(
  memory: LabelMemory,
  rows: readonly { transactionId: string; text: string }[],
): LabelMemory {
  const added = new Map<string, string[]>();
  for (const row of rows) {
    const text = normaliseBankText(row.text);
    if (text === "") continue;
    added.set(row.transactionId, [
      ...(added.get(row.transactionId) ?? []),
      text,
    ]);
  }
  if (added.size === 0) return memory;
  return {
    ...memory,
    transactions: memory.transactions.map((transaction) => {
      const texts = added.get(transaction.id);
      return texts
        ? {
            ...transaction,
            bankTexts: [...new Set([...transaction.bankTexts, ...texts])],
          }
        : transaction;
    }),
  };
}
