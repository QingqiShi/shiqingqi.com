/**
 * The whole screens that the Patterns page lists. Each one renders outside the
 * docs frame, in its own app frame, so it is not a route of the docs registry.
 * Plain strings, so the sitemap reads them without the i18n runtime.
 */
export const PATTERN_PATHS = [
  "/design-system/patterns/dashboard",
  "/design-system/patterns/settings",
  "/design-system/patterns/list",
  "/design-system/patterns/form",
] as const;

export type PatternPath = (typeof PATTERN_PATHS)[number];
