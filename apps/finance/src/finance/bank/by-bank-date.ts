/** Bank rows in the order the bank booked them: by date, then by provider id. */
export function byBankDate<Row extends { date: string; providerTxId: string }>(
  rows: readonly Row[],
) {
  return [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.providerTxId.localeCompare(b.providerTxId),
  );
}
