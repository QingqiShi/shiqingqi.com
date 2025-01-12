import type { ReactNode } from "react";
import { use } from "react";
import type { TranslationConfig } from "@/types";
import { parseMessage } from "@/utils/parse-message";
import { TranslationContext } from "@/utils/translation-context";

/**
 * Same as `getTranslations`, but for client components.
 * Instead of passing translations to the hook directly, translations must be pass to the `TranslationProvider`.
 */
export function useTranslations<T extends TranslationConfig>(
  namespace: string
) {
  const value = use(TranslationContext);
  if (!value) {
    throw new Error(
      "`useTranslations` must be used within a `TranslationProvider`"
    );
  }
  const { translations } = value;
  if (!translations[namespace]) {
    throw new Error(`Translations for namespace "${namespace}" not found`);
  }

  function t(key: keyof T): string;
  function t(key: keyof T, opts: { parse?: boolean }): ReactNode;
  function t(
    key: keyof T,
    { parse }: { parse?: boolean } = {}
  ): ReactNode | string {
    const message =
      translations[namespace][key as keyof (typeof translations)[string]];
    if (!message) {
      throw new Error(`Translation for key "${key.toString()}" not found`);
    }
    if (parse) {
      return parseMessage(message);
    }
    return message;
  }

  return { t };
}
