import type {
  AccountRow,
  CategoryRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";

/** Why a Transaction is in Review, or what the AI said about it. */
export type ReviewReason =
  | { type: "inTransit"; amountMinor: number; currency: string }
  | { type: "ai"; text: string }
  | { type: "aiFailed" };

/**
 * The reason to show for a Transaction: where its money went, when a
 * transfer still has an Entry on In transit; else what the AI said; else,
 * for an AI Transaction on Uncategorised, that the AI could not label it.
 */
export function reviewReason(
  row: Pick<TransactionRow, "kind" | "labelledBy" | "aiReason" | "categoryId">,
  entries: readonly Pick<EntryRow, "accountId" | "amountMinor">[],
  lookups: {
    accountById: ReadonlyMap<string, Pick<AccountRow, "isSystem" | "currency">>;
    categoryById: ReadonlyMap<string, Pick<CategoryRow, "isSystem">>;
  },
): ReviewReason | null {
  if (row.kind === "transfer") {
    for (const entry of entries) {
      const account = lookups.accountById.get(entry.accountId);
      if (account?.isSystem) {
        return {
          type: "inTransit",
          amountMinor: Math.abs(entry.amountMinor),
          currency: account.currency,
        };
      }
    }
  }
  if (row.labelledBy !== "ai") return null;
  if (row.aiReason) return { type: "ai", text: row.aiReason };
  const category =
    row.categoryId === null
      ? undefined
      : lookups.categoryById.get(row.categoryId);
  return category?.isSystem ? { type: "aiFailed" } : null;
}
