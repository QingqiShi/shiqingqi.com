"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import type { ToastAction } from "@tuja/ui/components/toast";
import { DetailEditor } from "../editor/detail-editor.tsx";
import { TransactionEditor } from "../editor/transaction-editor.tsx";
import type { NetWorthDestination } from "../navigation/finance-href.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import { UnbackedTransactionNotice } from "./bank-balance-notice.tsx";

interface LedgerTransactionProps {
  accountId: string;
  transactionId: string;
  watchCorrection: (transactionId: string) => () => ToastAction | undefined;
}

/**
 * A Transaction from an account's Ledger, in the detail column of Net worth,
 * with the bank's notice where the bank does not show it. Close, and a
 * save, take the column off and go back to the account. A refund, and a
 * save that asks for a new one, open a new Transaction over the account;
 * its close comes back to this Transaction.
 */
export function LedgerTransaction({
  accountId,
  transactionId,
  watchCorrection,
}: LedgerTransactionProps) {
  const navigator = useFinanceNavigator();
  const column = useSplitViewColumn();
  const account: NetWorthDestination = {
    screen: "netWorth",
    account: accountId,
  };
  const close = () => {
    if (column?.close) column.close();
    else navigator.replace(account);
  };

  return (
    <DetailEditor>
      <TransactionEditor
        key={transactionId}
        transactionId={transactionId}
        showClose
        notice={
          <UnbackedTransactionNotice
            accountId={accountId}
            transactionId={transactionId}
            onDeleted={close}
          />
        }
        onClose={close}
        onSaved={(_, andNew) => {
          if (andNew) {
            navigator.open({ ...account, newTransaction: { kind: "expense" } });
          } else {
            close();
          }
        }}
        onOpenTransaction={(id) => {
          navigator.replace({ ...account, tx: id });
        }}
        onRefund={(id) => {
          navigator.open({
            ...account,
            newTransaction: { kind: "expense", refundOf: id },
          });
        }}
        watchCorrection={watchCorrection}
      />
    </DetailEditor>
  );
}
