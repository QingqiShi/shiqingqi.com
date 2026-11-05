import { downloadBlob } from "@tuja/ui/utils/download-blob";

/** Exported cell values are `unknown`; render the primitives, JSON the rest. */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Leading characters that make a spreadsheet evaluate a cell as a formula. */
const CSV_FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Escape one cell for a delimited export. Used for both the CSV download and
 * the tab-separated clipboard copy — the destination is a spreadsheet either
 * way, so both need the same treatment.
 */
export function toDelimitedCell(value: unknown, delimiter: string) {
  const text = cellToText(value);
  // TMDB titles and overviews are community-edited free text, and a cell
  // starting with `=` is a live formula once it lands in Excel or Sheets. A
  // leading apostrophe forces it back to text. Numbers are exempt so a
  // negative value stays a number.
  const safe =
    typeof value !== "number" && CSV_FORMULA_LEAD.test(text)
      ? `'${text}`
      : text;
  // A bare CR is a row separator to some readers, so it has to be quoted too.
  return safe.includes(delimiter) || /["\n\r]/.test(safe)
    ? `"${safe.replaceAll('"', '""')}"`
    : safe;
}

export function downloadCsv(rows: unknown[][], filename: string) {
  const csv = rows
    .map((row) => row.map((cell) => toDelimitedCell(cell, ",")).join(","))
    .join("\n");
  // The BOM keeps Excel from mangling non-ASCII titles on open.
  const blob = new Blob([`\u{FEFF}${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, filename);
}
