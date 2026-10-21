import type { ReactNode } from "react";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";
import {
  describeTransaction,
  type TransactionDescription,
} from "./describe-transaction.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";
import { transactionIcon } from "./transaction-face.tsx";
import { useTransactionKindLabels } from "./use-transaction-kind-labels.ts";

export interface TransactionRowDescription extends TransactionDescription {
  icon: ReactNode;
}

interface DescribeOptions {
  entries: readonly EntryRow[];
  tagIds: readonly string[];
  /** The account of the Ledger, or null in a list across accounts. */
  accountId: string | null;
}

export function useDescribeTransaction(lookups: TransactionLookups) {
  const categoryName = useCategoryDisplayName();
  const kindLabels = useTransactionKindLabels();

  return (
    transaction: TransactionRow,
    { entries, tagIds, accountId }: DescribeOptions,
  ): TransactionRowDescription => {
    const category =
      transaction.categoryId === null
        ? undefined
        : lookups.categoryById.get(transaction.categoryId);
    const description = describeTransaction({
      transaction,
      entries,
      accountId,
      payeeName:
        transaction.payeeId === null
          ? undefined
          : lookups.payeeById.get(transaction.payeeId)?.name,
      categoryLabel: category ? categoryName(category) : undefined,
      kindLabel: kindLabels[transaction.kind],
      tagNames: tagIds.flatMap((id) => {
        const name = lookups.tagById.get(id)?.name;
        return name ? [name] : [];
      }),
      accountLabel: (id) => lookups.accountLabelById.get(id) ?? "",
    });
    return {
      ...description,
      icon: transactionIcon(transaction, lookups, description.title),
    };
  };
}
