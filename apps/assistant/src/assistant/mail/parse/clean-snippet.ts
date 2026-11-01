/** The longest snippet kept. Classification sends at most the first ~4,000 characters. */
export const SNIPPET_MAX_CHARS = 16_000;

// Zero-width and other invisible characters that marketing mail pads its preview text with.
const INVISIBLE = /[\u034f\u00ad\u200b-\u200f\u2028\u2029\u2060-\u2064\ufeff]/g;

function isQuoteHeader(line: string) {
  return /^(On .+ wrote:|在.+写道：?|-{2,}\s*Original Message\s*-{2,}|_{10,})$/i.test(
    line,
  );
}

/**
 * The text of a mail as the classifier reads it: invisible characters gone,
 * the quoted earlier mail of a reply cut off, blank lines and runs of spaces
 * collapsed, at most `SNIPPET_MAX_CHARS` characters.
 */
export function cleanSnippet(text: string): string {
  const lines: string[] = [];
  for (const rawLine of text.replace(INVISIBLE, "").split(/\r?\n/)) {
    const line = rawLine.replace(/[ \t\u00a0]+/g, " ").trim();
    if (isQuoteHeader(line)) break;
    if (line.startsWith(">")) continue;
    if (line === "" && (lines.length === 0 || lines.at(-1) === "")) continue;
    lines.push(line);
  }
  while (lines.at(-1) === "") lines.pop();
  return lines.join("\n").slice(0, SNIPPET_MAX_CHARS);
}
