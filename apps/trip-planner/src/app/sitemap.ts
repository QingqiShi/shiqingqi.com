import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { MetadataRoute } from "next";
import { BASE_URL } from "#src/base-url.ts";
import { PUBLIC_PATHS } from "#src/landing/public-page-metadata.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string, locale: "en" | "zh") =>
    new URL(getLocalePath(path, locale), BASE_URL).toString();
  return PUBLIC_PATHS.map((path) => ({
    url: url(path, "en"),
    alternates: { languages: { en: url(path, "en"), zh: url(path, "zh") } },
  }));
}
