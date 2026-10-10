/** The longest Payee name a model may propose. */
const MAX_PAYEE_NAME_LENGTH = 80;

/**
 * A model-proposed Payee name made safe to store: no control or format
 * characters, one space between words, at most 80 characters. Empty when
 * nothing usable is left.
 */
export function cleanPayeeName(name: string): string {
  const cleaned = name
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(cleaned).slice(0, MAX_PAYEE_NAME_LENGTH).join("").trim();
}
