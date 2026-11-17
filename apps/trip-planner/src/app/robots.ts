import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { MetadataRoute } from "next";
import { BASE_URL } from "#src/base-url.ts";
import { PUBLIC_PATHS } from "#src/landing/public-page-metadata.ts";

// Crawlers may read the public pages and nothing else. `$` ends a rule, so
// that `/` and `/zh` do not open every path below them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: PUBLIC_PATHS.flatMap((path) =>
        (["en", "zh"] as const).map(
          (locale) => `${getLocalePath(path, locale)}$`,
        ),
      ),
      disallow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
