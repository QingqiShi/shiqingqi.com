import "server-only";
import { cache } from "react";
import type { SupportedLocale } from "#src/types.ts";

// React's cache() gives each server request its own store, preventing
// concurrent pages from clobbering each other's locale during static
// generation. The factory must create a new object (not return a
// module-level singleton) so each request gets an isolated copy.
const getLocaleStore =
  process.env.NODE_ENV === "test"
    ? (() => {
        const store: { locale: SupportedLocale } = { locale: "en" };
        return () => store;
      })()
    : cache((): { locale: SupportedLocale } => ({ locale: "en" }));

export function setLocale(locale: SupportedLocale) {
  getLocaleStore().locale = locale;
}

export function getLocale(): SupportedLocale {
  return getLocaleStore().locale;
}
