import "server-only";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { Metadata } from "next";
import { BASE_URL } from "#src/constants.ts";
import { getPatternCopy } from "./get-pattern-copy.ts";
import type { PatternPath } from "./pattern-paths.ts";

/**
 * A pattern renders outside the docs layout, so it does not get the docs
 * title template. It writes the whole title itself.
 */
export function patternMetadata(
  locale: SupportedLocale,
  path: PatternPath,
): Metadata {
  const { name, description } = getPatternCopy()[path];
  const url = (forLocale: SupportedLocale) =>
    new URL(getLocalePath(path, forLocale), BASE_URL).toString();
  return {
    title: `${name} | ${t({
      en: "Patterns | Design System | Qingqi Shi",
      zh: "模式 | 设计系统 | 石清琪",
    })}`,
    description,
    alternates: {
      canonical: url(locale),
      languages: { en: url("en"), zh: url("zh") },
    },
  };
}
