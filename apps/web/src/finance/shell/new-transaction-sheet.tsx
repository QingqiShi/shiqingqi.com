"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { t } from "#src/i18n.ts";
import { readNewTransaction } from "../navigation/finance-href.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import { useReplica } from "../replica/use-replica.ts";
import { PaneSheet } from "./pane-sheet.tsx";

const TransactionEditor = dynamic(() =>
  import("../editor/transaction-editor.tsx").then(
    (mod) => mod.TransactionEditor,
  ),
);

interface NewTransactionSheetProps {
  /** The account a new Transaction starts on, such as the account whose page is open. */
  accountId?: string | null;
}

/**
 * The new Transaction that `FinanceAddButton` opens (`?new=`), in a sheet
 * over the screen that hosts it. A close, a save, or back leaves the screen
 * as it was. Put it outside a `NavigationSplitView`, so the editor is not in
 * one of its columns.
 */
export function NewTransactionSheet({
  accountId = null,
}: NewTransactionSheetProps) {
  const navigator = useFinanceNavigator();
  const newTransaction = readNewTransaction(useSearchParams());
  const close = () => {
    navigator.close({ screen: "current" });
  };
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const focusTargetRef = useRef<HTMLElement | null>(null);

  return (
    <PaneSheet
      isOpen={newTransaction !== null}
      onClose={close}
      label={t({ en: "New transaction", zh: "新建交易" })}
      initialFocusRef={focusTargetRef}
    >
      {newTransaction !== null && bootstrapped ? (
        <TransactionEditor
          key={`${newTransaction.kind}-${newTransaction.refundOf ?? ""}-${accountId ?? ""}`}
          transactionId={null}
          initialKind={newTransaction.kind}
          refundOfId={newTransaction.refundOf}
          initialAccountId={accountId}
          focusTargetRef={focusTargetRef}
          onClose={close}
          onSaved={(_, andNew) => {
            if (!andNew) close();
          }}
          onOpenTransaction={(id) => {
            navigator.replace({ screen: "transactions", id });
          }}
        />
      ) : null}
    </PaneSheet>
  );
}
