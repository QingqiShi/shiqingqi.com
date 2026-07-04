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
 *
 * Passing an optional localized `description` enriches the entry with a meta
 * description plus matching Open Graph and Twitter cards. Callers that omit it
 * keep the prior title-and-alternates-only output unchanged.
 */
export function designSystemMetadata(options: {
  locale: SupportedLocale;
  path: string;
  title: string;
  description?: string;
}): Metadata {
  const { locale, path, title, description } = options;
  const url = (forLocale: SupportedLocale) =>
    new URL(getLocalePath(path, forLocale), BASE_URL).toString();
  // Assigning through a typed `Metadata` local gives `openGraph.type` and
  // `twitter.card` their literal contextual types (a conditional spread would
  // widen them to `string` and break assignability).
  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: url(locale),
      languages: { en: url("en"), zh: url("zh") },
    },
  };
  if (description) {
    metadata.openGraph = { title, description, type: "website" };
    metadata.twitter = { card: "summary" };
  }
  return metadata;
}
