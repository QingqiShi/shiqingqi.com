import type { SupportedLocale } from "@tuja/i18n/types";
import type { Config } from "next-i18n-router/dist/types";

export const i18nConfig: Config = {
  locales: ["en", "zh"],
  defaultLocale: "en",
};

/** The BCP 47 tag that each locale's text renders with in `lang`. */
export const htmlLang = {
  en: "en",
  zh: "zh-Hans",
} as const satisfies Record<SupportedLocale, string>;
