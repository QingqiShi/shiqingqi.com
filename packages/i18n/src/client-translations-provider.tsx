"use client";

import { use, type PropsWithChildren } from "react";
import { I18nContext } from "./i18n-context";

interface ClientTranslationsProviderProps {
  translations: Record<string, string>;
}

/**
 * Adds the translations of a page or a layout to those of the layouts around
 * it. A component of a layout can render inside a page, such as the
 * destinations of a `TabView` that a screen draws in its sidebar, and it still
 * needs the translations of its layout there.
 */
export function ClientTranslationsProvider({
  translations,
  children,
}: PropsWithChildren<ClientTranslationsProviderProps>) {
  const around = use(I18nContext);
  const value = { translations: { ...around.translations, ...translations } };
  return <I18nContext value={value}>{children}</I18nContext>;
}
