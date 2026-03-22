import "server-only";

import type { ReactNode } from "react";

import translationsEn from "#src/_generated/i18n/translations.en.json";
import translationsZh from "#src/_generated/i18n/translations.zh.json";
import { getLocale } from "#src/i18n/server-locale.ts";
import type { SupportedLocale } from "#src/types.ts";
import { parseMessage } from "#src/utils/parse-message.tsx";

const bundles: Record<SupportedLocale, Record<string, string>> = {
  en: translationsEn,
  zh: translationsZh,
};

export function __i18n_lookup(key: string): string {
  const value = bundles[getLocale()][key];
  if (process.env.NODE_ENV !== "production" && value === undefined) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return value;
}

export function __i18n_lookupParse(key: string): ReactNode {
  const value = bundles[getLocale()][key];
  if (process.env.NODE_ENV !== "production" && value === undefined) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return parseMessage(value);
}
