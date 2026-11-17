"use client";

import * as stylex from "@stylexjs/stylex";
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
 * read each in its own language. A note typed on more than one line keeps
 * its lines and blank lines.
 */
export function TripText({ children }: { children: ReactNode }) {
  const lang = useTripLang();
  const hasLines = typeof children === "string" && children.includes("\n");
  if (!lang && !hasLines) return children;
  return (
    <span lang={lang} css={hasLines && styles.lines}>
      {children}
    </span>
  );
}

const styles = stylex.create({
  lines: { whiteSpace: "pre-line" },
});
