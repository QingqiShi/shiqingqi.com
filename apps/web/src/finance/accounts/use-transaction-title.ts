import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";

/** Names a Transaction in a Ledger row: its Payee, else its Category, else its note, else its kind. */
export function useTransactionTitle() {
  const categoryName = useCategoryDisplayName();
  const payees = useReplica((snapshot) => snapshot.tables.payees);
  const categories = useReplica((snapshot) => snapshot.tables.categories);
  const kindLabels: Record<TransactionRow["kind"], string> = {
    expense: t({ en: "Expense", zh: "支出" }),
    income: t({ en: "Income", zh: "收入" }),
    transfer: t({ en: "Transfer", zh: "转账" }),
  };

  return (transaction: TransactionRow) => {
    const payee =
      transaction.payeeId === null
        ? undefined
        : payees.get(transaction.payeeId);
    if (payee) return payee.name;
    const category =
      transaction.categoryId === null
        ? undefined
        : categories.get(transaction.categoryId);
    if (category) return categoryName(category);
    return transaction.note || kindLabels[transaction.kind];
  };
}
