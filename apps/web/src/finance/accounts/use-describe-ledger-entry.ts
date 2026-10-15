import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { transactionIcon } from "../transactions/transaction-face.tsx";
import { useTransactionLookups } from "../transactions/use-transaction-lookups.ts";
import { ledgerEntrySubtitle } from "./ledger-entry-subtitle.ts";

export interface LedgerEntryDescription {
  title: string;
  subtitle: string;
  icon: ReactNode;
}

export function useDescribeLedgerEntry() {
  const categoryName = useCategoryDisplayName();
  const lookups = useTransactionLookups();
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const kindLabels: Record<TransactionRow["kind"], string> = {
    expense: t({ en: "Expense", zh: "支出" }),
    income: t({ en: "Income", zh: "收入" }),
    transfer: t({ en: "Transfer", zh: "转账" }),
  };

  return (
    transaction: TransactionRow,
    accountId: string,
  ): LedgerEntryDescription => {
    const payee =
      transaction.payeeId === null
        ? undefined
        : lookups.payeeById.get(transaction.payeeId);
    const category =
      transaction.categoryId === null
        ? undefined
        : lookups.categoryById.get(transaction.categoryId);
    const categoryLabel = category ? categoryName(category) : undefined;
    const title =
      payee?.name ??
      categoryLabel ??
      (transaction.note || kindLabels[transaction.kind]);
    return {
      title,
      subtitle: ledgerEntrySubtitle({
        transaction,
        entries: entriesByTransaction.get(transaction.id) ?? [],
        accountId,
        title,
        categoryLabel,
        accountLabel: (id) => lookups.accountLabelById.get(id) ?? "",
      }),
      icon: transactionIcon(transaction, lookups, title),
    };
  };
}
