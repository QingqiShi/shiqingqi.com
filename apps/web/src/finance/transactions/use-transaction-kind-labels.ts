import { t } from "@tuja/i18n";
import type { TransactionRow } from "../sync/row-schemas.ts";

export function useTransactionKindLabels(): Record<
  TransactionRow["kind"],
  string
> {
  return {
    expense: t({ en: "Expense", zh: "支出" }),
    income: t({ en: "Income", zh: "收入" }),
    transfer: t({ en: "Transfer", zh: "转账" }),
  };
}
