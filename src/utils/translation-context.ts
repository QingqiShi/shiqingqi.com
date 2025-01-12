import { createContext, use } from "react";
import type { SupportedLocale } from "@/types";

export const TranslationContext = createContext<{
  locale: SupportedLocale;
  translations: { [namespace: string]: { [key: string]: string } };
} | null>(null);

export function useTranslationContext() {
  const value = use(TranslationContext);
  if (!value) {
    throw new Error(
      "`useTranslationContext` must be used within a `TranslationProvider`"
    );
  }
  return value;
}
