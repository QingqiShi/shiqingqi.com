import { createContext } from "react";
import type { SupportedLocale } from "@/types";

export const TranslationContext = createContext<{
  locale: SupportedLocale;
  translations: { [namespace: string]: { [key: string]: string } };
} | null>(null);
