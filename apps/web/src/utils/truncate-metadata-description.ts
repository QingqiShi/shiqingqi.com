import type { SupportedLocale } from "#src/types.ts";

const ELLIPSIS = "…";

/**
 * Truncate a free-form description for use in HTML/social metadata so
 * unfurlers (Twitter, Slack, Discord, Facebook, LinkedIn, Google SERP)
 * don't cut mid-word. Word-boundary aware for whitespace-segmented
 * locales (en); falls back to a character cut for CJK (zh) where there
 * are no whitespace boundaries. Returns the input unchanged if it
 * already fits, so short overviews keep their sentence-final
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

  if (locale === "zh") {
    return text.slice(0, budget) + ELLIPSIS;
  }

  const slice = text.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  // If we somehow can't find a space (very long single token), fall back
  // to the character cut so we still respect the cap.
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return trimmed.replace(/[\s,;:.!?—–-]+$/u, "") + ELLIPSIS;
}
