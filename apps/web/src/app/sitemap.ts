import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { MetadataRoute } from "next";
import { BASE_URL } from "#src/constants.ts";
import { DESIGN_SYSTEM_LAB_PATHS } from "#src/design-system/routes/design-system-lab-paths.ts";
import { DESIGN_SYSTEM_PATHS } from "#src/design-system/routes/design-system-paths.ts";

const SITE_PATHS = [
  "/",
  "/experiences/citadel",
  "/experiences/spotify",
  "/experiences/wunderman-thompson-commerce",
  "/education/university-of-bristol",
  "/education/university-of-nottingham",
  "/education/altrincham-grammar-school-for-boys",
  "/movie-database",
  "/calculator",
];

function toAbsoluteUrl(path: string, locale: SupportedLocale): string {
  const localePath = getLocalePath(path, locale);
  return localePath === "/" ? BASE_URL : `${BASE_URL}${localePath}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...SITE_PATHS,
    ...DESIGN_SYSTEM_PATHS,
    ...DESIGN_SYSTEM_LAB_PATHS,
  ].flatMap((path) => {
    const languages = {
      en: toAbsoluteUrl(path, "en"),
      zh: toAbsoluteUrl(path, "zh"),
    };
    return [
      { url: languages.en, alternates: { languages } },
      { url: languages.zh, alternates: { languages } },
    ];
  });
}
