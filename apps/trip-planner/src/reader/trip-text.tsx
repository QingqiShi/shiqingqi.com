"use client";

import { useLocale } from "@tuja/i18n/use-locale";
import { createContext, use, type ReactNode } from "react";
import type { Trip } from "#src/trips/types.ts";

const TripLanguageContext = createContext<Trip["language"] | null>(null);

export function TripLanguageProvider({
  language,
  children,
}: {
  language: Trip["language"];
  children: ReactNode;
}) {
  return <TripLanguageContext value={language}>{children}</TripLanguageContext>;
}

/** The `lang` of the trip's own words, where they differ from the page's. */
export function useTripLang(): Trip["language"] | undefined {
  const language = use(TripLanguageContext);
  const locale = useLocale();
  return language && language !== locale ? language : undefined;
}

/**
 * Words from the trip itself. The page is in the reader's language, and the
 * trip in the language it was written in, so a screen reader and the font
 * read each in its own language.
 */
export function TripText({ children }: { children: ReactNode }) {
  const lang = useTripLang();
  return lang ? <span lang={lang}>{children}</span> : children;
}
