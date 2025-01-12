import type { PropsWithChildren } from "react";
import type { TranslationConfig } from "@/types";
import { getRequestLocale } from "@/utils/request-locale";
import { TranslationContextProvider } from "./translation-context-provider";

interface TranslationProviderProps {
  translations: { [namespace: string]: TranslationConfig };
}

/**
 * Provides translations to client components.
 */
export async function TranslationProvider({
  children,
  translations,
}: PropsWithChildren<TranslationProviderProps>) {
  const locale = await getRequestLocale();
  const localeTranslations = Object.fromEntries(
    Object.entries(translations).map(([namespace, componentTranslations]) => [
      namespace,
      Object.fromEntries(
        Object.entries(componentTranslations).map(([key, value]) => [
          key,
          value[locale],
        ])
      ),
    ])
  );
  return (
    <TranslationContextProvider
      locale={locale}
      translations={localeTranslations}
    >
      {children}
    </TranslationContextProvider>
  );
}
