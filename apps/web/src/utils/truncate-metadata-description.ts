import type { SupportedLocale } from "#src/types.ts";

const ELLIPSIS = "…";

/**
 * Truncate a free-form description for use in HTML/social metadata so
 * unfurlers (Twitter, Slack, Discord, Facebook, LinkedIn, Google SERP)
 * don't cut mid-word. Uses `Intl.Segmenter` to find word boundaries in
 * a locale-aware way (works for whitespace-segmented scripts and CJK
 * alike) and falls back to a grapheme cut for pathological inputs that
 * have no word boundary within the budget. Returns the input unchanged
 * if it already fits, so short overviews keep their sentence-final
 * punctuation. Returns `undefined` when the input is null/undefined so
 * callers can pass through null safely.
 */
export function truncateMetadataDescription(
  text: string | null | undefined,
  locale: SupportedLocale,
  cap: number,
): string | undefined {
  if (text == null) return undefined;
  if (text.length <= cap) return text;

  const budget = cap - ELLIPSIS.length;

  let consumed = 0;
  let lastWordEnd = 0;
  for (const { segment, isWordLike } of new Intl.Segmenter(locale, {
    granularity: "word",
  }).segment(text)) {
    if (consumed + segment.length > budget) break;
    consumed += segment.length;
    if (isWordLike) lastWordEnd = consumed;
  }

  if (lastWordEnd > 0) {
    return text.slice(0, lastWordEnd) + ELLIPSIS;
  }

  // Pathological input (e.g. one giant token with no word boundaries):
  // grapheme-cut to the budget so we never split a surrogate pair.
  let graphemeEnd = 0;
  for (const { segment } of new Intl.Segmenter(locale, {
    granularity: "grapheme",
  }).segment(text)) {
    if (graphemeEnd + segment.length > budget) break;
    graphemeEnd += segment.length;
  }
  return text.slice(0, graphemeEnd) + ELLIPSIS;
}
