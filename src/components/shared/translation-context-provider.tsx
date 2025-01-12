"use client";

import type { PropsWithChildren } from "react";
import type { SupportedLocale } from "@/types";
import { TranslationContext } from "@/utils/translation-context";

interface TranslationContextProviderProps {
  locale: SupportedLocale;
  translations: { [namespace: string]: { [key: string]: string } };
}

/**
 * Client component to use the context.
 */
export function TranslationContextProvider({
  children,
  locale,
  translations,
}: PropsWithChildren<TranslationContextProviderProps>) {
  return (
    <TranslationContext value={{ locale, translations }}>
      {children}
    </TranslationContext>
  );
}
