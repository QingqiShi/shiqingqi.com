import "server-only";

import { parseMessage } from "@tuja/i18n/parse-message";
import { getLocale } from "@tuja/i18n/server-locale";
import type { SupportedLocale } from "@tuja/i18n/types";
import type { ReactNode } from "react";

import translationsEn from "#src/_generated/i18n/translations.en.json";
import translationsZh from "#src/_generated/i18n/translations.zh.json";

const bundles: Record<SupportedLocale, Record<string, string>> = {
  en: translationsEn,
  zh: translationsZh,
};

export function __i18n_lookup(key: string): string {
  const bundle = bundles[getLocale()];
  if (process.env.NODE_ENV !== "production" && !(key in bundle)) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return bundle[key];
}

export function __i18n_lookupParse(key: string): ReactNode {
  const bundle = bundles[getLocale()];
  if (process.env.NODE_ENV !== "production" && !(key in bundle)) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return parseMessage(bundle[key]);
}
