"use client";

import type { PropsWithChildren } from "react";
import { LocaleContext } from "./locale-context";
import type { SupportedLocale } from "./types.ts";

interface I18nProviderProps {
  locale: SupportedLocale;
}

export function I18nProvider({
  locale,
  children,
}: PropsWithChildren<I18nProviderProps>) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
