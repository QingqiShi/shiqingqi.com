/**
 * Tiny filename slugifier for the PNG export filenames.
 *
 * The downloaded files end up at the OS level, so we keep the surface tight:
 * lowercased ASCII letters, digits, and hyphens. Anything else collapses to
 * a single hyphen and we trim leading/trailing hyphens. Empty input (or
 * input that contains no slug-safe characters) maps to a stable fallback so
 * the resulting filename is never just `creature--.png`.
 */
export const SLUG_FALLBACK = "untitled";

export function slugifyName(input: string): string {
  const lowered = input.toLowerCase();
  // Replace any run of non-alphanumeric characters with a single hyphen.
  // We deliberately do NOT try to romanise non-ASCII (e.g. Chinese) names;
  // a creature called "团子" simply gets the fallback. The user's chosen
  // name still appears inside the card via `def.name` — only the filename
  // strips it.
  const collapsed = lowered.replace(/[^a-z0-9]+/g, "-");
  const trimmed = collapsed.replace(/^-+|-+$/g, "");
  return trimmed.length === 0 ? SLUG_FALLBACK : trimmed;
}
