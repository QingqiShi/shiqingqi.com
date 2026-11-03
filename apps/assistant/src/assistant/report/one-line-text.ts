/**
 * Text as one line, for a title that comes from outside the page: a line break
 * or other control character becomes a space. Postgres also refuses a NUL.
 */
export function oneLineText(text: string): string {
  return text.replaceAll(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, " ").trim();
}
