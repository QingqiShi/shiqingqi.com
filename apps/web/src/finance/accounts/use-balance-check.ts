import { useToast } from "@tuja/ui/components/toast-provider";
import { useEffect, useState } from "react";
import { t } from "#src/i18n.ts";
import {
  balanceCheckOf,
  ledgerBalanceAt,
  type BalanceCheck,
} from "../bank/balance-check-of.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import type {
  BankLinkRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";

interface UnbackedRow {
  entry: EntryRow;
  transaction: TransactionRow;
}

export interface BalanceCheckView {
  check: BalanceCheck;
  /** The Entries behind the difference that no bank row backs, oldest first; null while the server reads them. */
  unbacked: UnbackedRow[] | null;
  /** The part of our excess over the bank that the unbacked Entries do not explain. */
  unexplainedMinor: number;
  /** Keeps a Transaction that the bank left out, with an Undo on the toast. */
  keep: (transactionId: string) => Promise<void>;
}

/**
 * The ids of the Entries behind a Bank link's balance difference, read from
 * the server, which holds the bank rows. It reads them again when
 * `readKey` changes, once the server has every local mutation, and reads
 * nothing while `readKey` is null.
 */
function useUnbackedIds(
  linkId: string,
  readKey: string | null,
): readonly string[] | null {
  const [result, setResult] = useState<{
    key: string;
    /** Null when the read failed. */
    ids: readonly string[] | null;
  } | null>(null);
  const outboxEmpty = useReplica((snapshot) => snapshot.outboxCount === 0);
  const key = readKey === null ? null : `${linkId}:${readKey}`;

  useEffect(() => {
    if (key === null || result?.key === key) return;
    // Wait for the push. A read before the push of an Undo does not include the restored Entry.
    if (result !== null && !outboxEmpty) return;
    const controller = new AbortController();
    const settle = (ids: readonly string[] | null) => {
      if (!controller.signal.aborted) setResult({ key, ids });
    };
    bankApiClient.listUnbackedEntries(linkId, controller.signal).then(
      ({ entryIds }) => {
        settle(entryIds);
      },
      () => {
        settle(null);
      },
    );
    return () => {
      controller.abort();
    };
  }, [linkId, key, outboxEmpty, result]);

  // Keep the last list while the next read runs, so the rows do not blink.
  if (key === null) return null;
  return result?.ids ?? null;
}

/** The server read the list before the last local change: an Entry that left the account's posted Ledger since is no longer behind the difference. */
function isUnbackedStill(
  entry: EntryRow,
  transaction: TransactionRow,
  accountId: string,
) {
  return (
    entry.deletedAt === null &&
    entry.accountId === accountId &&
    transaction.deletedAt === null &&
    transaction.status === "posted"
  );
}

/**
 * Keeps a Transaction that the bank left out, with an Undo on the toast.
 * `setKept` marks it at once, and unmarks it when the keep fails or is
 * undone.
 */
function useKeepTransaction(
  linkId: string,
  setKept: (transactionId: string, kept: boolean) => void,
) {
  const showToast = useToast();
  const { runtime } = useFinanceRuntime();
  const keptLabel = t({ en: "Kept", zh: "已保留" });
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const failedLabel = t({
    en: "Couldn't save. Try again.",
    zh: "保存失败，请重试。",
  });

  const unkeep = async (transactionId: string) => {
    try {
      await bankApiClient.unkeepTransaction(linkId, transactionId);
      await runtime.loop.sync();
      setKept(transactionId, false);
    } catch {
      showToast({ message: failedLabel });
    }
  };

  return async (transactionId: string) => {
    setKept(transactionId, true);
    try {
      await bankApiClient.keepTransaction(linkId, transactionId);
    } catch {
      setKept(transactionId, false);
      showToast({ message: failedLabel });
      return;
    }
    showToast({
      message: keptLabel,
      action: {
        label: undoLabel,
        onAction: () => void unkeep(transactionId),
      },
    });
    await runtime.loop.sync();
  };
}

/**
 * The balance check of a Bank link as the Replica has it now: the bank's
 * balance against ours, and the Entries no bank row backs. Our balance comes
 * from the Replica, so the check goes once a Member deletes a duplicate.
 * Null when the balances agree, while bank rows wait, when the bank gave
 * no balance, or in the demo, which cannot keep a Transaction.
 */
export function useBalanceCheck(link: BankLinkRow): BalanceCheckView | null {
  const oursMinor = useReplica((snapshot) =>
    link.bankBalanceOn === null
      ? 0
      : ledgerBalanceAt(
          selectBalanceSeriesByAccount(snapshot).get(link.accountId),
          link.bankBalanceOn,
        ),
  );
  const check = balanceCheckOf(link, () => oursMinor);
  const entryRows = useReplica((snapshot) => snapshot.tables.entries);
  const transactionRows = useReplica(
    (snapshot) => snapshot.tables.transactions,
  );
  const unbackedIds = useUnbackedIds(
    link.id,
    check === null
      ? null
      : `${String(link.version)}:${String(check.ourExcessMinor)}`,
  );
  const { readOnly } = useFinanceRuntime();
  const [keptIds, setKeptIds] = useState<ReadonlySet<string>>(() => new Set());
  const keep = useKeepTransaction(link.id, (transactionId, kept) => {
    setKeptIds((current) => {
      const next = new Set(current);
      if (kept) next.add(transactionId);
      else next.delete(transactionId);
      return next;
    });
  });

  if (check === null || readOnly) return null;
  const unbacked =
    unbackedIds?.flatMap((id) => {
      const entry = entryRows.get(id);
      const transaction = entry && transactionRows.get(entry.transactionId);
      return entry &&
        transaction &&
        !keptIds.has(transaction.id) &&
        isUnbackedStill(entry, transaction, link.accountId)
        ? [{ entry, transaction }]
        : [];
    }) ?? null;
  const explainedMinor = (unbacked ?? []).reduce(
    (sum, row) => sum + row.entry.amountMinor,
    0,
  );
  return {
    check,
    unbacked,
    unexplainedMinor: check.ourExcessMinor - explainedMinor,
    keep,
  };
}
