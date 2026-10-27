"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { UnbackedTransactionNotice } from "../accounts/bank-balance-notice.tsx";
import {
  readNewTransaction,
  type FinanceDestination,
  type NewTransaction,
} from "../navigation/finance-href.ts";
import {
  isOpenedEntry,
  useFinanceNavigator,
} from "../navigation/finance-navigator.ts";
import { useReplica } from "../replica/use-replica.ts";
import { DrawnAfterRest } from "../shell/drawn-after-rest.tsx";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import { focusRow } from "../transactions/focus-row.ts";
import { transactionFilters } from "../transactions/transaction-filters.ts";
import { useTeachAi } from "../transactions/use-teach-ai.tsx";
import type { EditorDraft } from "./editor-draft.ts";
import { TransactionEditorSkeleton } from "./transaction-editor-skeleton.tsx";
import {
  TransactionEditor,
  type EditorFocusTarget,
  type EditorHost,
} from "./transaction-editor.tsx";

/** The screen that a Transaction task opens over. */
export type TransactionTaskContext =
  | { screen: "transactions" }
  /** `account` is the account whose page shows, which a new Transaction starts on. */
  | { screen: "netWorth"; account: string | null }
  /** A screen with no Transaction of its own, such as Analytics. */
  | { screen: "current" };

/** The Transaction editor of a screen, and the ways to open and close it. */
export interface TransactionTask {
  /** The editor of `transactionId`, for the detail column of the screen's `NavigationSplitView`. */
  detail: (transactionId: string) => ReactNode;
  /** The new Transaction of the URL (`?new=`) in a sheet. Put it outside the `NavigationSplitView`. */
  sheet: ReactNode;
  /** Opens a new Transaction, filled in with `draft` when it is given, such as from quick add. */
  openNew: (draft?: EditorDraft) => void;
  /** Opens `transactionId` in the detail column, with focus on `focus` in its editor when it is given. */
  open: (transactionId: string, focus?: EditorFocusTarget) => void;
  /** Closes what is open, and gives focus back to the row of the Transaction that was open. */
  close: () => void;
}

/** The screen under the task with nothing open, with the filters that the URL has now. */
function screenOf(context: TransactionTaskContext): FinanceDestination {
  switch (context.screen) {
    case "transactions":
      return {
        screen: "transactions",
        filters: transactionFilters.parse(
          new URLSearchParams(window.location.search),
        ),
      };
    case "netWorth":
      return { screen: "netWorth", account: context.account };
    case "current":
      return { screen: "current" };
  }
}

/** The Transactions list with `transactionId` open, and the filters of the list when it is the screen. */
function inList(
  context: TransactionTaskContext,
  transactionId: string,
): FinanceDestination {
  const under = screenOf(context);
  return under.screen === "transactions"
    ? { ...under, id: transactionId }
    : { screen: "transactions", id: transactionId };
}

/** The screen with `transactionId` in its detail column: an account's Ledger, or the Transactions list. */
function inDetail(
  context: TransactionTaskContext,
  transactionId: string,
): FinanceDestination {
  const under = screenOf(context);
  return under.screen === "netWorth" && under.account != null
    ? { ...under, tx: transactionId }
    : inList(context, transactionId);
}

/**
 * The host of the Transaction editor on a screen: an existing Transaction
 * in the detail column, and a new one in a sheet. It decides, from
 * `context`, what a save, a save that asks for a new one, a refund, a link
 * to another Transaction and a close do.
 *
 * A close takes the detail column off. A save goes back from an entry
 * that `open` made, as the list's own close does, and gives focus back to
 * the Transaction's row. A refund, and a save of an existing Transaction
 * that asks for a new one, open a new Transaction over the screen. On Net worth its close comes back
 * to the Transaction. On Transactions the open Transaction and a new one
 * take one place, so a new one replaces what is open, and one close leaves
 * it. Quick add gives its draft through `openNew`, and the editor then
 * moves focus to the first field the draft leaves empty.
 */
export function useTransactionTask(
  context: TransactionTaskContext,
): TransactionTask {
  const navigator = useFinanceNavigator();
  const params = useSearchParams();
  const newTransaction = readNewTransaction(params);
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const teach = useTeachAi();
  const [seed, setSeed] = useState<{
    draft: EditorDraft;
    nonce: number;
  } | null>(null);
  const [focusRequest, setFocusRequest] =
    useState<EditorHost["focusRequest"]>(undefined);
  const focusTargetRef = useRef<HTMLElement | null>(null);

  const openId = context.screen === "transactions" ? params.get("id") : null;
  const isOneOpen =
    context.screen === "transactions" &&
    (openId !== null || newTransaction !== null);
  const openOver = isOneOpen ? navigator.replace : navigator.open;
  const accountId = context.screen === "netWorth" ? context.account : null;

  const startNew = (next: NewTransaction, draft?: EditorDraft) => {
    setSeed(draft ? { draft, nonce: Date.now() } : null);
    setFocusRequest(undefined);
    openOver({ ...screenOf(context), newTransaction: next });
  };
  const replaceWith = (to: FinanceDestination) => {
    setSeed(null);
    navigator.replace(to);
  };
  const refund = (transactionId: string) => {
    startNew({ kind: "expense", refundOf: transactionId });
  };

  const closeSheet = () => {
    setSeed(null);
    navigator.close({ screen: "current" });
  };
  const sheetHost: EditorHost = {
    focusRequest:
      focusRequest ??
      (seed
        ? {
            target: seed.draft.amountText === "" ? "amount" : "category",
            nonce: seed.nonce,
          }
        : undefined),
    focusTargetRef,
    close: closeSheet,
    afterSave: (_, andNew) => {
      if (!andNew) closeSheet();
    },
    openTransaction: (transactionId) => {
      replaceWith(inList(context, transactionId));
    },
    refund,
    watchCorrection: teach.watch,
  };

  const detailHost = (
    transactionId: string,
    columnClose: (() => void) | null,
  ): EditorHost => {
    const close =
      columnClose ??
      (() => {
        navigator.close(screenOf(context));
      });
    return {
      focusRequest,
      close,
      afterSave: (_, andNew) => {
        if (andNew) {
          startNew({ kind: "expense" });
        } else if (isOpenedEntry()) {
          navigator.close(screenOf(context));
          focusRow(transactionId);
        } else {
          close();
        }
      },
      openTransaction: (otherId) => {
        replaceWith(inDetail(context, otherId));
      },
      refund,
      watchCorrection: teach.watch,
    };
  };

  return {
    detail: (transactionId) => (
      <TaskDetail
        transactionId={transactionId}
        accountId={accountId}
        isReady={bootstrapped}
        hostOf={detailHost}
      />
    ),
    sheet: (
      <>
        <PaneSheet
          isOpen={newTransaction !== null}
          onClose={closeSheet}
          label={t({ en: "New transaction", zh: "新建交易" })}
          initialFocusRef={focusTargetRef}
        >
          {newTransaction !== null && bootstrapped ? (
            <TransactionEditor
              key={`${newTransaction.kind}-${newTransaction.refundOf ?? ""}-${accountId ?? ""}-${String(seed?.nonce ?? 0)}`}
              transactionId={null}
              initialKind={newTransaction.kind}
              refundOfId={newTransaction.refundOf}
              initialAccountId={accountId}
              seedDraft={seed?.draft}
              host={sheetHost}
            />
          ) : null}
        </PaneSheet>
        {teach.sheet}
      </>
    ),
    openNew: (draft) => {
      startNew({ kind: draft?.kind ?? "expense" }, draft);
    },
    open: (transactionId, focus) => {
      setFocusRequest((previous) =>
        focus === undefined
          ? undefined
          : { target: focus, nonce: (previous?.nonce ?? 0) + 1 },
      );
      if (openId !== transactionId) openOver(inDetail(context, transactionId));
    },
    close: () => {
      setSeed(null);
      navigator.close(screenOf(context));
      if (openId !== null) focusRow(openId);
    },
  };
}

/** The new Transaction sheet of a screen with no Transaction of its own, such as Analytics. */
export function NewTransactionTask() {
  return useTransactionTask({ screen: "current" }).sheet;
}

interface TaskDetailProps {
  transactionId: string;
  /** The account whose Ledger opened the Transaction, for the bank's notice. */
  accountId: string | null;
  isReady: boolean;
  hostOf: (
    transactionId: string,
    columnClose: (() => void) | null,
  ) => EditorHost;
}

/**
 * A Transaction in the detail column. In a sheet, the editor's skeleton
 * shows first, and the editor draws after it, in a deferred pass of its
 * own, and fades in. The editor takes the most time to draw, so the sheet
 * then starts to lift out of its row at once.
 */
function TaskDetail({
  transactionId,
  accountId,
  isReady,
  hostOf,
}: TaskDetailProps) {
  const column = useSplitViewColumn();
  const host = hostOf(transactionId, column?.close ?? null);
  return (
    <DrawnAfterRest
      isImmediate={column?.presentation !== "sheet"}
      skeleton={<TransactionEditorSkeleton />}
    >
      {isReady ? (
        <TransactionEditor
          key={transactionId}
          transactionId={transactionId}
          notice={
            accountId === null ? null : (
              <UnbackedTransactionNotice
                accountId={accountId}
                transactionId={transactionId}
                onDeleted={host.close}
              />
            )
          }
          host={host}
        />
      ) : null}
    </DrawnAfterRest>
  );
}
