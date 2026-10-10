import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import type { EntryRow, TransactionRow } from "../sync/row-schemas.ts";

interface UnconfirmInput {
  /** The Expected Transaction as it was before the confirm. */
  transaction: TransactionRow;
  entries: readonly Pick<EntryRow, "accountId" | "amountMinor" | "fxRate">[];
  tagIds: readonly string[];
  createId: () => string;
}

/**
 * The Undo of a confirm. No mutation sets a Transaction back to Expected,
 * so Undo deletes the confirmed row and adds the Expected one again under a
 * new id. A Rule does not make the occurrence again: the deleted row keeps
 * the occurrence's id.
 */
export function unconfirmMutations({
  transaction,
  entries,
  tagIds,
  createId,
}: UnconfirmInput): LocalMutationInput[] {
  return [
    { name: "deleteTransaction", args: { id: transaction.id } },
    {
      name: "createTransaction",
      args: {
        id: createId(),
        kind: transaction.kind,
        status: "expected",
        date: transaction.date,
        amountMinor: transaction.amountMinor,
        categoryId: transaction.categoryId,
        payeeId: transaction.payeeId,
        memberId: transaction.memberId,
        ruleId: transaction.ruleId,
        refundOfId: transaction.refundOfId,
        note: transaction.note,
        needsReview: transaction.needsReview,
        entries: entries.map((entry) => ({
          id: createId(),
          accountId: entry.accountId,
          amountMinor: entry.amountMinor,
          fxRate: entry.fxRate,
        })),
        tagIds: [...tagIds],
      },
    },
  ];
}
