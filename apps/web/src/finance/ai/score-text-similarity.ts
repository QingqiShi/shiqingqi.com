import { comparableText, type ComparableText } from "./comparable-text.ts";

const SHARED_PREFIX_LENGTH = 4;
const SHARED_PREFIX_BONUS = 0.2;

/**
 * How alike two bank texts or Payee names are, from 0 to 1: the Jaccard
 * overlap of their words, plus 0.2 when they start with the same four or
 * more characters.
 */
export function scoreTextSimilarity(
  a: string | ComparableText,
  b: string | ComparableText,
): number {
  const left = typeof a === "string" ? comparableText(a) : a;
  const right = typeof b === "string" ? comparableText(b) : b;
  if (left.normalised === "" || right.normalised === "") return 0;
  if (left.normalised === right.normalised) return 1;

  let shared = 0;
  for (const token of left.tokens) if (right.tokens.has(token)) shared++;
  const union = left.tokens.size + right.tokens.size - shared;
  const jaccard = union === 0 ? 0 : shared / union;

  let prefix = 0;
  while (
    prefix < left.compact.length &&
    prefix < right.compact.length &&
    left.compact[prefix] === right.compact[prefix]
  ) {
    prefix++;
  }
  const bonus = prefix >= SHARED_PREFIX_LENGTH ? SHARED_PREFIX_BONUS : 0;
  return Math.min(1, jaccard + bonus);
}
