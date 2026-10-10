import type { ImportRows, TransactionRow } from "./types.ts";

/** Reads a transaction's payee name, tag names and note as one text. */
export function textOfTransaction(
  rows: Pick<ImportRows, "payees" | "tags" | "transactionTags">,
) {
  const names = new Map<string, string>(
    [...rows.payees, ...rows.tags].map((row) => [row.id, row.name]),
  );
  const tagIdsOf = new Map<string, string[]>();
  for (const { transactionId, tagId } of rows.transactionTags) {
    tagIdsOf.set(transactionId, [
      ...(tagIdsOf.get(transactionId) ?? []),
      tagId,
    ]);
  }
  return (t: Pick<TransactionRow, "id" | "payeeId" | "note">) =>
    [
      t.payeeId ? names.get(t.payeeId) : "",
      ...(tagIdsOf.get(t.id) ?? []).map((tagId) => names.get(tagId)),
      t.note,
    ].join(" ");
}
