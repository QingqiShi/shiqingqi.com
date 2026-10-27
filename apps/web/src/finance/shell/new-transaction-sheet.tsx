"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { PaneSheet } from "./pane-sheet.tsx";
import { useNewTransactionUrl } from "./use-new-transaction-url.ts";

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
  const locale = useLocale();
  const router = useRouter();
  const url = useNewTransactionUrl();
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const focusTargetRef = useRef<HTMLElement | null>(null);

  return (
    <PaneSheet
      isOpen={url.kind !== null}
      onClose={url.close}
      label={t({ en: "New transaction", zh: "新建交易" })}
      initialFocusRef={focusTargetRef}
    >
      {url.kind !== null && bootstrapped ? (
        <TransactionEditor
          key={`${url.kind}-${url.refundOfId ?? ""}-${accountId ?? ""}`}
          transactionId={null}
          initialKind={url.kind}
          refundOfId={url.refundOfId}
          initialAccountId={accountId}
          focusTargetRef={focusTargetRef}
          onClose={url.close}
          onSaved={(_, andNew) => {
            if (!andNew) url.close();
          }}
          onOpenTransaction={(id) => {
            router.replace(
              getLocalePath(
                `/finance/transactions?id=${encodeURIComponent(id)}`,
                locale,
              ),
            );
          }}
        />
      ) : null}
    </PaneSheet>
  );
}
