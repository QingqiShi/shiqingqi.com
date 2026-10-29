/**
 * Whether a Transaction is Expected and dated after `today`. The transaction
 * list, the account ledger and the Expected count leave it out until its day
 * comes, because nothing about it has happened yet.
 */
export function isFutureExpected(
  transaction: { status: "posted" | "expected"; date: string },
  today: string,
): boolean {
  return transaction.status === "expected" && transaction.date > today;
}
