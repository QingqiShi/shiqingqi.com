import type { SupportedLocale } from "./types.ts";

export function isValidLocale(locale: string): locale is SupportedLocale {
  return locale === "en" || locale === "zh";
}

export function validateLocale(locale: string): SupportedLocale {
  if (isValidLocale(locale)) {
    return locale;
  }
  return "en";
}
