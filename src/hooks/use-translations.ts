import type { ReactNode } from "react";
import type { TranslationConfig } from "#src/types.ts";
import { parseMessage } from "#src/utils/parse-message.tsx";
import { useTranslationContext } from "#src/utils/translation-context.ts";

/**
 * Same as `getTranslations`, but for client components.
 * Instead of passing translations to the hook directly, translations must be pass to the `TranslationProvider`.
 */
export function useTranslations<T extends TranslationConfig>(
  namespace: string,
) {
  const { translations } = useTranslationContext();
  if (!translations[namespace]) {
    throw new Error(`Translations for namespace "${namespace}" not found`);
  }

  function t(key: keyof T): string;
  function t(key: keyof T, opts: { parse?: boolean }): ReactNode;
  function t(
    key: keyof T,
    { parse }: { parse?: boolean } = {},
  ): ReactNode | string {
    const message = translations[namespace][key as string];
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
