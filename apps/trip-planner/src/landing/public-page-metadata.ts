import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { Metadata } from "next";
import { BASE_URL } from "#src/base-url.ts";

/** The pages that search engines may index: the landing page, and the terms and privacy page. */
export const PUBLIC_PATHS = ["/", "/terms"] as const;

/**
 * Opens a public page to search engines, which the locale layout closes for
 * every other page, and names the page in each language.
 */
export function publicPageMetadata(
  path: (typeof PUBLIC_PATHS)[number],
  locale: SupportedLocale,
): Metadata {
  const url = (pageLocale: SupportedLocale) =>
    new URL(getLocalePath(path, pageLocale), BASE_URL).toString();
  return {
    robots: { index: true, follow: true },
    alternates: {
      canonical: url(locale),
      languages: { en: url("en"), zh: url("zh"), "x-default": url("en") },
    },
  };
}
