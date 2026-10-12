/** The Entries a balance check shows before "Show all". */
export const UNBACKED_SHOWN = 5;

/** The first `UNBACKED_SHOWN` of `rows` until the Member expands the list, and how many wait behind "Show all". */
export function shownUnbackedEntries<Row>(
  rows: readonly Row[],
  expanded: boolean,
): { shown: readonly Row[]; hidden: number } {
  if (expanded || rows.length <= UNBACKED_SHOWN) {
    return { shown: rows, hidden: 0 };
  }
  return {
    shown: rows.slice(0, UNBACKED_SHOWN),
    hidden: rows.length - UNBACKED_SHOWN,
  };
}
