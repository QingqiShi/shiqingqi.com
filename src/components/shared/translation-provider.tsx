"use client";

import type { PropsWithChildren } from "react";
import type { SupportedLocale } from "@/types";
import { TranslationContext } from "@/utils/translation-context";

interface TranslationProviderProps {
  locale: SupportedLocale;
  translations: { [k: string]: string };
}

/**
 * Provides translations to client components.
 */
export function TranslationProvider({
  children,
  locale,
  translations,
}: PropsWithChildren<TranslationProviderProps>) {
  return (
    <TranslationContext value={{ locale, translations }}>
      {children}
    </TranslationContext>
  );
}
