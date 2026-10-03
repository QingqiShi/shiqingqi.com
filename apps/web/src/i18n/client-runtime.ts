/* eslint-disable @tuja/export-matches-filename -- the i18n Babel plugin
   hardcodes this path as a compile target, so the file name is a contract. */
import type { ReactNode } from "react";
import { use } from "react";
import { I18nContext } from "#src/i18n/i18n-context.ts";
import { parseMessage } from "./parse-message.tsx";

type Translations = Record<string, string>;

export function useI18nTranslations(): Translations {
  return use(I18nContext).translations;
}

export function i18nLookup(
  translations: Translations,
  translationKey: string,
): string {
  if (
    process.env.NODE_ENV !== "production" &&
    !(translationKey in translations)
  ) {
    throw new Error(`[i18n] Missing translation key: ${translationKey}`);
  }
  return translations[translationKey];
}

export function i18nLookupParse(
  translations: Translations,
  translationKey: string,
): ReactNode {
  return parseMessage(i18nLookup(translations, translationKey));
}
