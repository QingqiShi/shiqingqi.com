const NO_LINE_START = new Set("，。、？！；：…）」』”’,.?!;:)".split(""));

function unitsOf(ch: string) {
  const code = ch.codePointAt(0) ?? 0;
  if (ch === " ") return 0.3;
  if (code < 0x2e80) return 0.56;

  return 1;
}

export function wrapText(
  text: string,
  maxUnits: number,
  maxLines: number,
  measure: (ch: string) => number = unitsOf,
) {
  const tokens = text.match(/[A-Za-z0-9_#$%.,:+\-/@'"`]+|\s|./gu) ?? [];
  const rows: string[] = [];
  let row = "";
  let units = 0;
  for (const token of tokens) {
    const w = Array.from(token).reduce((sum, ch) => sum + measure(ch), 0);
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
  if (rows.length <= maxLines) return { rows, isCut: false };
  const kept = rows.slice(0, maxLines);
  kept[maxLines - 1] =
    Array.from(kept[maxLines - 1])
      .slice(0, -1)
      .join("") + "…";

  return { rows: kept, isCut: true };
}
