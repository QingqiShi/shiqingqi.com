/** The position after the last of `rows`, or 0 when there are none. */
export function nextPosition(rows: readonly { position: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
}
