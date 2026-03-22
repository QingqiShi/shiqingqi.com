"use client";

import type { PropsWithChildren } from "react";
import type { SupportedLocale } from "#src/types.ts";
import { LocaleContext } from "./locale-context";

interface I18nProviderProps {
  locale: SupportedLocale;
}

export function I18nProvider({
  locale,
  children,
}: PropsWithChildren<I18nProviderProps>) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
