import { glyphEm } from "./svg.ts";

const NO_LINE_START = new Set("，。、？！；：…）」』”’,.?!;:)".split(""));

function breakRows(text: string, maxUnits: number) {
  const tokens = text.match(/[A-Za-z0-9_#$%.,:+\-/@'"`]+|\s|./gu) ?? [];
  const rows: string[] = [];
  let row = "";
  let units = 0;
  for (const token of tokens) {
    const w = Array.from(token).reduce((sum, ch) => sum + glyphEm(ch), 0);
    const isMark = NO_LINE_START.has(token);
    if (units + w > maxUnits && row.trim() !== "" && !isMark) {
      rows.push(row.trimEnd());
      row = token === " " ? "" : token;
      units = token === " " ? 0 : w;
    } else {
      row += token;
      units += w;
    }
  }
  if (row.trim() !== "") rows.push(row.trimEnd());

  return rows;
}

/**
 * Breaks `text` into at most `maxLines` rows of `maxUnits` em. The rows are balanced: they take
 * the narrowest width that needs no more rows, so the last row is not left with one word.
 */
export function wrapText(text: string, maxUnits: number, maxLines: number) {
  const rows = breakRows(text, maxUnits);
  if (rows.length > maxLines) {
    const kept = rows.slice(0, maxLines);
    kept[maxLines - 1] =
      Array.from(kept[maxLines - 1])
        .slice(0, -1)
        .join("") + "…";

    return kept;
  }
  if (rows.length < 2) return rows;
  let narrow = 0;
  let wide = maxUnits;
  while (wide - narrow > 0.25) {
    const mid = (narrow + wide) / 2;
    if (breakRows(text, mid).length > rows.length) narrow = mid;
    else wide = mid;
  }

  return breakRows(text, wide);
}
