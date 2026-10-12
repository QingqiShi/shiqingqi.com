export type LabelledBy = "member" | "ai";

/** Who writes a change: a Member through a push, or the server on its own. */
export type WriteActor = "member" | "server";

interface LabelledTransaction {
  labelledBy: LabelledBy;
  kind: string;
  categoryId: string | null;
  payeeId: string | null;
  memberId: string | null;
  note: string;
  needsReview: boolean;
  entries: readonly { accountId: string }[];
  tagIds: readonly string[];
}

function sameMembers(a: readonly string[], b: readonly string[]) {
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return (
    sortedA.length === sortedB.length &&
    sortedA.every((value, index) => value === sortedB[index])
  );
}

/**
 * Who decided a Transaction's labels after a change. A Member who changes
 * a label (the kind, Category, Payee, Member, note, Tags or an Entry's
 * account) or clears Review takes the labels over. A change of date or
 * amount alone, or a change the server makes, keeps who it was.
 */
export function labelledByAfter(
  actor: WriteActor,
  before: LabelledTransaction,
  after: Omit<LabelledTransaction, "labelledBy">,
): LabelledBy {
  if (actor !== "member" || before.labelledBy === "member") {
    return before.labelledBy;
  }
  const relabelled =
    after.kind !== before.kind ||
    after.categoryId !== before.categoryId ||
    after.payeeId !== before.payeeId ||
    after.memberId !== before.memberId ||
    after.note !== before.note ||
    !sameMembers(after.tagIds, before.tagIds) ||
    !sameMembers(
      after.entries.map((entry) => entry.accountId),
      before.entries.map((entry) => entry.accountId),
    );
  const reviewed = before.needsReview && !after.needsReview;
  return relabelled || reviewed ? "member" : before.labelledBy;
}
