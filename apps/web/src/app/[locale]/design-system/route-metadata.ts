import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

/**
 * Metadata for a design-system sub-route: a self-canonical plus en/zh hreflang
 * derived from the route's locale-agnostic path. Without per-page `alternates`,
 * sub-pages shallow-inherit the layout's `/design-system` canonical and would
 * point crawlers at the overview instead of themselves. The localized `title`
 * composes against the layout's `%s | Design System | Qingqi Shi` template.
 */
export function designSystemMetadata(options: {
  locale: SupportedLocale;
  path: string;
  title: string;
}): Metadata {
  const { locale, path, title } = options;
  const url = (forLocale: SupportedLocale) =>
    new URL(getLocalePath(path, forLocale), BASE_URL).toString();
  return {
    title,
    alternates: {
      canonical: url(locale),
      languages: { en: url("en"), zh: url("zh") },
    },
  };
}
