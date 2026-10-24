"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import type { ToastAction } from "@tuja/ui/components/toast";
import { useRouter } from "next/navigation";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { TransactionEditor } from "../editor/transaction-editor.tsx";
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
 * save, take the column off and go back to the account.
 */
export function LedgerTransaction({
  accountId,
  transactionId,
  watchCorrection,
}: LedgerTransactionProps) {
  const locale = useLocale();
  const router = useRouter();
  const url = useNetWorthUrl();
  const column = useSplitViewColumn();
  const close = () => {
    if (column?.close) column.close();
    else router.replace(url.hrefOf({ account: accountId }), { scroll: false });
  };

  return (
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
          router.push(
            getLocalePath("/finance/transactions?new=expense", locale),
          );
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
        router.push(
          getLocalePath(
            `/finance/transactions?new=expense&refund=${id}`,
            locale,
          ),
        );
      }}
      watchCorrection={watchCorrection}
    />
  );
}
