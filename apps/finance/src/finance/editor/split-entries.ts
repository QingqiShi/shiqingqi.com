import type { EntryRow } from "../sync/row-schemas.ts";

type EntryLike = Pick<EntryRow, "accountId" | "amountMinor">;

interface SplitEntries<Entry extends EntryLike> {
  /** The Entry the editor's amount and account show. */
  main: Entry | undefined;
  /** The second Entry, when it moves against the main one, such as a loan repayment. */
  paysDown: Entry | undefined;
  /** Every other Entry. The editor does not show them and keeps them as they are. */
  others: Entry[];
}

/**
 * How the editor reads the Entries of an expense or income, in their order:
 * the first is the main one, a second one with the other sign pays down a
 * loan or card (or adds to money owed to the Household), and the rest stay
 * untouched.
 */
export function splitEntries<Entry extends EntryLike>(
  entries: readonly Entry[],
): SplitEntries<Entry> {
  const main = entries.at(0);
  const second = entries.at(1);
  const rest = entries.slice(2);
  if (main === undefined) return { main, paysDown: undefined, others: [] };
  if (
    second !== undefined &&
    Math.sign(second.amountMinor) === -Math.sign(main.amountMinor)
  ) {
    return { main, paysDown: second, others: rest };
  }
  return {
    main,
    paysDown: undefined,
    others: second === undefined ? rest : [second, ...rest],
  };
}
