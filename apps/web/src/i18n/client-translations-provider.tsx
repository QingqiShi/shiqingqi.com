"use client";

import type { PropsWithChildren } from "react";
import { I18nContext } from "./i18n-context";

interface ClientTranslationsProviderProps {
  translations: Record<string, string>;
}

export function ClientTranslationsProvider({
  translations,
  children,
}: PropsWithChildren<ClientTranslationsProviderProps>) {
  return <I18nContext value={{ translations }}>{children}</I18nContext>;
}
