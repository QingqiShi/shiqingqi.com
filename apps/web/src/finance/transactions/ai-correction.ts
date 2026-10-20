import type { NamedLabels, TeachRequest } from "../ai/types.ts";
import { categoryAncestry } from "../domain/category-ancestry.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import {
  categoryDisplayName,
  type SystemCategoryNames,
} from "../store/category-display-name.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import type { TransactionLookups } from "./select-transaction-lookups.ts";

/** The labels of a Transaction that a Member corrects, by id. */
interface LabelIds {
  kind: NamedLabels["kind"];
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  tagIds: readonly string[];
  /** The accounts of the Entries: the other account of a transfer, or the loan an expense pays down. */
  accountIds: readonly string[];
}

export interface LabelledTransaction {
  id: string;
  labelledBy: "member" | "ai";
  labels: LabelIds;
}

/** A live Transaction of the Replica with who labelled it and its labels. */
export function labelledTransactionIn(
  snapshot: ReplicaSnapshot,
  transactionId: string,
): LabelledTransaction | null {
  const row = snapshot.tables.transactions.get(transactionId);
  if (!row || row.deletedAt !== null) return null;
  const entries = selectEntriesByTransaction(snapshot).get(transactionId) ?? [];
  const tagIds = selectTagIdsByTransaction(snapshot).get(transactionId) ?? [];
  return {
    id: row.id,
    labelledBy: row.labelledBy,
    labels: {
      kind: row.kind,
      categoryId: row.categoryId,
      payeeId: row.payeeId,
      memberId: row.memberId,
      tagIds: [...tagIds].sort(),
      accountIds: [...new Set(entries.map((entry) => entry.accountId))].sort(),
    },
  };
}

function sameLabels(a: LabelIds, b: LabelIds) {
  return (
    a.kind === b.kind &&
    a.categoryId === b.categoryId &&
    a.payeeId === b.payeeId &&
    a.memberId === b.memberId &&
    a.tagIds.join() === b.tagIds.join() &&
    a.accountIds.join() === b.accountIds.join()
  );
}

function categoryPath(
  categoryId: string,
  lookups: TransactionLookups,
  names: SystemCategoryNames,
) {
  return categoryAncestry(categoryId, lookups.categoryById)
    .map((category) => categoryDisplayName(category, names))
    .join(" > ");
}

function nameLabels(
  labels: LabelIds,
  lookups: TransactionLookups,
  names: SystemCategoryNames,
): NamedLabels {
  return {
    kind: labels.kind,
    category:
      labels.categoryId === null
        ? null
        : categoryPath(labels.categoryId, lookups, names),
    payee:
      labels.payeeId === null
        ? null
        : (lookups.payeeById.get(labels.payeeId)?.name ?? null),
    tags: labels.tagIds.flatMap((id) => {
      const tag = lookups.tagById.get(id);
      return tag ? [tag.name] : [];
    }),
    member:
      labels.memberId === null
        ? null
        : (lookups.memberById.get(labels.memberId)?.name ?? null),
    accounts: labels.accountIds.map(
      (id) => lookups.accountLabelById.get(id) ?? "?",
    ),
  };
}

/**
 * What "Teach the AI" sends after a save: the AI's labels from before the
 * save and the Member's from after it, by name. Null unless the AI labelled
 * the Transaction and the save changed its labels.
 */
export function aiCorrection(
  before: LabelledTransaction | null,
  after: LabelledTransaction | null,
  lookups: TransactionLookups,
  names: SystemCategoryNames,
): TeachRequest | null {
  if (!before || !after || before.labelledBy !== "ai") return null;
  if (sameLabels(before.labels, after.labels)) return null;
  return {
    transactionId: after.id,
    ai: nameLabels(before.labels, lookups, names),
    member: nameLabels(after.labels, lookups, names),
  };
}
