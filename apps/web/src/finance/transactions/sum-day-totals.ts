import type { TransactionRow } from "../sync/row-schemas.ts";

interface DayTotals {
  /** Posted expenses net of refunds: negative for money out. */
  expenseMinor: number;
  incomeMinor: number;
}

/** What a day's posted Transactions spent and received. Transfers count in neither. */
export function sumDayTotals(
  rows: readonly TransactionRow[],
  amountOf: (row: TransactionRow) => number,
): DayTotals {
  let expenseMinor = 0;
  let incomeMinor = 0;
  for (const row of rows) {
    if (row.status !== "posted") continue;
    if (row.kind === "expense") expenseMinor += amountOf(row);
    else if (row.kind === "income") incomeMinor += amountOf(row);
  }
  return { expenseMinor, incomeMinor };
}
