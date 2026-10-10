import { useMemo } from "react";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { selectTransactionsByPayee } from "../store/select-transactions-by-payee.ts";
import { selectTransactionLookups } from "../transactions/select-transaction-lookups.ts";

/** Everything the editor reads from the Replica, each part stable until its tables change. */
export function useEditorData() {
  const { memberId } = useFinanceRuntime();
  const lookups = useReplica(selectTransactionLookups);
  const accounts = useReplica(liveRowSelectors.accounts);
  const accountGroups = useReplica(liveRowSelectors.accountGroups);
  const categories = useReplica(liveRowSelectors.categories);
  const members = useReplica(liveRowSelectors.members);
  const tags = useReplica(liveRowSelectors.tags);
  const payees = useReplica(liveRowSelectors.payees);
  const rules = useReplica(liveRowSelectors.rules);
  const transactions = useReplica(selectTransactionsByDateDesc);
  const byPayee = useReplica(selectTransactionsByPayee);
  const byAccount = useReplica(selectTransactionsByAccount);
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const tagIdsByTransaction = useReplica(selectTagIdsByTransaction);
  const fx = useReplica(selectFxIndex);
  const valuations = useReplica((snapshot) => snapshot.tables.valuations);
  const transactionsTable = useReplica(
    (snapshot) => snapshot.tables.transactions,
  );

  const baseCurrency = useBaseCurrency();
  const today = useHouseholdToday();

  const openAccounts = useMemo(
    () => accounts.filter((account) => account.closedOn === null),
    [accounts],
  );
  const liveCategories = useMemo(
    () => categories.filter((category) => category.archivedAt === null),
    [categories],
  );
  const livePayees = useMemo(
    () => payees.filter((payee) => payee.mergedIntoId === null),
    [payees],
  );
  const lastUsedByPayee = useMemo(() => {
    const map = new Map<string, string>();
    for (const [payeeId, rows] of byPayee) {
      const first = rows.at(0);
      if (first) map.set(payeeId, first.date);
    }
    return map;
  }, [byPayee]);

  return {
    memberId,
    baseCurrency,
    today,
    lookups,
    accounts,
    accountGroups,
    openAccounts,
    categories: liveCategories,
    members,
    tags,
    payees: livePayees,
    rules,
    transactions,
    transactionsTable,
    byPayee,
    byAccount,
    entriesByTransaction,
    tagIdsByTransaction,
    fx,
    valuations,
    lastUsedByPayee,
  };
}

export type EditorData = ReturnType<typeof useEditorData>;
