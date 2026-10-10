const TRAILING_PLACE_TOKENS = new Set([
  "LONDON",
  "GB",
  "GBR",
  "UK",
  "ENG",
  "MANCHESTER",
  "BIRMINGHAM",
  "EDINBURGH",
  "GLASGOW",
  "LEEDS",
  "BRISTOL",
  "LIVERPOOL",
  "CAMBRIDGE",
  "OXFORD",
  "READING",
  "CARDIFF",
  "BELFAST",
]);

/**
 * The form a bank-statement string is remembered by as a Payee alias:
 * upper case, apostrophes dropped, digits and `*`/`#` made spaces, spaces
 * collapsed, and trailing city and country words dropped.
 * `TESCO STORES 3297 LONDON GB` → `TESCO STORES`.
 */
export function normaliseBankText(text: string): string {
  const tokens = text
    .toUpperCase()
    .replaceAll(/['’]/g, "")
    .replaceAll(/[\d*#]/g, " ")
    .split(/\s+/)
    .filter((token) => token !== "");
  while (tokens.length > 1 && TRAILING_PLACE_TOKENS.has(tokens.at(-1) ?? "")) {
    tokens.pop();
  }
  return tokens.join(" ");
}
