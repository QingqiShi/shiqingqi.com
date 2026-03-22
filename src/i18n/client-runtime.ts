"use client";

import type { ReactNode } from "react";
import { use } from "react";
import { I18nContext } from "#src/i18n/i18n-context.ts";
import { parseMessage } from "#src/utils/parse-message.tsx";

// The Babel plugin replaces t() calls with these hooks inline
// within component render, so the rules-of-hooks are satisfied.
export function useI18nLookup(key: string): string {
  const { translations } = use(I18nContext);
  const value = translations[key];
  if (process.env.NODE_ENV !== "production" && value === undefined) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return value;
}

export function useI18nLookupParse(key: string): ReactNode {
  const { translations } = use(I18nContext);
  const value = translations[key];
  if (process.env.NODE_ENV !== "production" && value === undefined) {
    throw new Error(`[i18n] Missing translation key: ${key}`);
  }
  return parseMessage(value);
}
