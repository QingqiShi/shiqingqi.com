"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import type { ToastAction } from "@tuja/ui/components/toast";
import { useRouter } from "next/navigation";
import { DetailEditor } from "../editor/detail-editor.tsx";
import { TransactionEditor } from "../editor/transaction-editor.tsx";
import { useNewTransactionUrl } from "../shell/use-new-transaction-url.ts";
import { UnbackedTransactionNotice } from "./bank-balance-notice.tsx";
import { useNetWorthUrl } from "./use-net-worth-url.ts";

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
  const router = useRouter();
  const url = useNetWorthUrl();
  const newTransaction = useNewTransactionUrl();
  const column = useSplitViewColumn();
  const accountHref = url.hrefOf({ account: accountId });
  const close = () => {
    if (column?.close) column.close();
    else router.replace(accountHref, { scroll: false });
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
            newTransaction.open({ from: accountHref });
          } else {
            close();
          }
        }}
        onOpenTransaction={(id) => {
          router.replace(url.hrefOf({ account: accountId, tx: id }), {
            scroll: false,
          });
        }}
        onRefund={(id) => {
          newTransaction.open({ refundOf: id, from: accountHref });
        }}
        watchCorrection={watchCorrection}
      />
    </DetailEditor>
  );
}
