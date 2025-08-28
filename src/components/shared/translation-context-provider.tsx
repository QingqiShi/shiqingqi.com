"use client";

import type { PropsWithChildren } from "react";
import type { SupportedLocale } from "@/types";
import { TranslationContext } from "@/utils/translation-context";

interface TranslationContextProviderProps {
  locale: SupportedLocale;
  translations: { [namespace: string]: { [key: string]: string } };
}

/**
 * Client component wrapper to provide translation context.
 *
 * This component is required because:
 * - TranslationProvider is a server component that processes translation data
 * - React Context (createContext) requires the "use client" directive
 * - Next.js requires this separation between server logic and client context
 *
 * The server component handles translation transformation,
 * while this client component handles the React Context provision.
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
