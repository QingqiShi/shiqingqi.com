interface LedgerLine {
  day: string;
  /** A Valuation: the balance at the end of its day. */
  valuationMinor?: number;
  /** An Entry: its amount on the account, and whether it counts (posted). */
  entry?: { amountMinor: number; counts: boolean };
}

/**
 * The account balance after each line of a ledger listed newest first, so a
 * statement can be checked line by line. The first counted Entry of a day
 * has the balance at the end of that day; each Entry below it has that
 * balance less the Entries above it. An Entry on a day with a Valuation is
 * inside the Valuation, and an Expected Entry does not count, so neither has
 * a balance of its own (null).
 */
export function ledgerRunningBalances(
  lines: readonly LedgerLine[],
  balanceAt: (day: string) => number,
): (number | null)[] {
  const result: (number | null)[] = [];
  let day: string | null = null;
  let dayHasValuation = false;
  let running = 0;
  for (const line of lines) {
    if (line.day !== day) {
      day = line.day;
      dayHasValuation = false;
      running = balanceAt(line.day);
    }
    if (line.valuationMinor !== undefined) {
      dayHasValuation = true;
      result.push(line.valuationMinor);
    } else if (line.entry && line.entry.counts && !dayHasValuation) {
      result.push(running);
      running -= line.entry.amountMinor;
    } else {
      result.push(null);
    }
  }
  return result;
}
