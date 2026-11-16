import { n, svg } from "./svg.ts";

/** How far a run of the sprite goes under its neighbours, in sprite cells. */
const SEAM = 0.3;

/**
 * The sprite as rectangles, one for each run of a colour. The pet scales and turns, so its edges
 * are smoothed, and two smoothed edges that meet let the sky show between them. Thus a run goes a
 * little under the run on its right, and under the row below it, which are drawn after it.
 * `isOnMore` says that more of the pet is drawn under the last row.
 */
export function spriteRuns(
  rows: readonly string[],
  yOffset: number,
  pick: (ch: string, x: number, y: number) => string | null,
  isOnMore = false,
) {
  const at = (ry: number, x: number) => {
    if (ry >= rows.length) return isOnMore && ry === rows.length ? "" : null;
    const row = rows[ry];

    return x < row.length ? pick(row[x] ?? ".", x, ry + yOffset) : null;
  };
  let out = "";
  rows.forEach((row, ry) => {
    const y = ry + yOffset;
    let x = 0;
    while (x < row.length) {
      const color = at(ry, x);
      if (color === null) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (at(ry, end) === color) end += 1;
      const width = end - x + (at(ry, end) === null ? 0 : SEAM);
      out += svg`<rect x="${x}" y="${y}" width="${n(width)}" height="1" fill="${color}"/>`;
      let from = x;
      while (from < end) {
        if (at(ry + 1, from) === null) {
          from += 1;
          continue;
        }
        let to = from + 1;
        while (to < end && at(ry + 1, to) !== null) to += 1;
        out += svg`<rect x="${from}" y="${y + 0.5}" width="${to - from}" height="${0.5 + SEAM}" fill="${color}"/>`;
        from = to;
      }
      x = end;
    }
  });

  return out;
}
