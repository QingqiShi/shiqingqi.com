/** A bank row as the balance check needs it. */
export interface BackingRow {
  date: string;
  state: "new" | "matched" | "missing" | "ignored";
  transactionId: string | null;
}

/**
 * The Entries behind a balance check's difference: of the Entries the ledger
 * side of the check sums, those dated within the bank history of the link
 * that no matched bank row of the link backs. Each is a payment the bank has
 * not posted yet, or a duplicate. Oldest first: the bank has had longest to
 * post an old one, so it is the likelier duplicate.
 */
export function selectUnbackedEntries<
  Entry extends { transactionId: string; date: string },
>(entries: readonly Entry[], bankRows: readonly BackingRow[]): Entry[] {
  if (bankRows.length === 0) return [];
  const historyFrom = bankRows.reduce(
    (earliest, row) => (row.date < earliest ? row.date : earliest),
    bankRows[0].date,
  );
  const backed = new Set(
    bankRows.flatMap((row) =>
      row.state === "matched" && row.transactionId !== null
        ? [row.transactionId]
        : [],
    ),
  );
  return entries
    .filter(
      (entry) => entry.date >= historyFrom && !backed.has(entry.transactionId),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
