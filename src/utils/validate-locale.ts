import type { SupportedLocale } from "#src/types.ts";

export function validateLocale(locale: string): SupportedLocale {
  if (locale === "en" || locale === "zh") {
    return locale;
  }
  // Fallback to English for invalid locales (should never happen with Next.js routing)
  return "en";
}
