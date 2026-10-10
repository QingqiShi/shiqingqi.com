import { normaliseBankText } from "./normalise-bank-text.ts";

/** A bank text or Payee name in the forms `scoreTextSimilarity` compares. */
export interface ComparableText {
  normalised: string;
  tokens: ReadonlySet<string>;
  /** `normalised` with only its letters and digits. */
  compact: string;
}

/** Prepares a text once, for a scorer that compares it with many others. */
export function comparableText(text: string): ComparableText {
  const normalised = normaliseBankText(text);
  return {
    normalised,
    tokens: new Set(
      normalised
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length >= 2 || /\P{ASCII}/u.test(token)),
    ),
    compact: normalised.replaceAll(/[^\p{L}\p{N}]/gu, ""),
  };
}
