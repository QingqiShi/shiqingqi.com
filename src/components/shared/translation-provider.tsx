import type { PropsWithChildren } from "react";
import type { SupportedLocale, TranslationConfig } from "@/types";
import { TranslationContext } from "@/utils/translation-context";

interface TranslationProviderProps {
  translations: { [namespace: string]: TranslationConfig };
  locale: SupportedLocale;
}

/**
 * Provides translations to client components.
 */
export function TranslationProvider({
  children,
  translations,
  locale,
}: PropsWithChildren<TranslationProviderProps>) {
  const localeTranslations = Object.fromEntries(
    Object.entries(translations).map(([namespace, componentTranslations]) => [
      namespace,
      Object.fromEntries(
        Object.entries(componentTranslations).map(([key, value]) => [
          key,
          value[locale],
        ]),
      ),
    ]),
  );
  return (
    <TranslationContext value={{ locale, translations: localeTranslations }}>
      {children}
    </TranslationContext>
  );
}
