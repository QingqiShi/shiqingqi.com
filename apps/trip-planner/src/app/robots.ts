import type { MetadataRoute } from "next";
import { BASE_URL } from "#src/base-url.ts";

// A crawler must read a page to find its `noindex`. Thus no page is
// disallowed here: a disallowed page that has a link to it can stay in the
// index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
