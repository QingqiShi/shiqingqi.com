"use client";

import { useLocale } from "@tuja/i18n/use-locale";
import { createContext, type ReactNode, use } from "react";
import { resolveDateLocale } from "./resolve-date-locale.ts";

const RegionalEnglishContext = createContext<string | null>(null);

/**
 * Gives the client the regional English that the server read from the
 * request, so that the server and the client write each date the same.
 */
export function DateLocaleProvider({
  regionalEnglish,
  children,
}: {
  regionalEnglish: string | null;
  children: ReactNode;
}) {
  return (
    <RegionalEnglishContext value={regionalEnglish}>
      {children}
    </RegionalEnglishContext>
  );
}

/** The locale that this page writes dates and times in. */
export function useDateLocale(): string {
  return resolveDateLocale(useLocale(), use(RegionalEnglishContext));
}
