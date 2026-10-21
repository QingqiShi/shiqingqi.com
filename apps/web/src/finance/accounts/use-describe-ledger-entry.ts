import { useReplica } from "../replica/use-replica.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import {
  type TransactionRowDescription,
  useDescribeTransaction,
} from "../transactions/use-describe-transaction.ts";
import { useTransactionLookups } from "../transactions/use-transaction-lookups.ts";

export function useDescribeLedgerEntry() {
  const describe = useDescribeTransaction(useTransactionLookups());
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const tagIdsByTransaction = useReplica(selectTagIdsByTransaction);

  return (
    transaction: TransactionRow,
    accountId: string,
  ): TransactionRowDescription =>
    describe(transaction, {
      entries: entriesByTransaction.get(transaction.id) ?? [],
      tagIds: tagIdsByTransaction.get(transaction.id) ?? [],
      accountId,
    });
}
