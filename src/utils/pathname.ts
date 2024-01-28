import type { SupportedLocale } from "../types";

const localePrefixes = /^\/(en|zh)($|\/)/;

export function normalizePath(pathname: string): string {
  const localeRemoved = pathname.replace(localePrefixes, "/");
  const trailingSlashRemoved =
    localeRemoved.length > 1 ? localeRemoved.replace(/\/$/, "") : localeRemoved;
  return trailingSlashRemoved;
}

export function getLocalePath(
  pathname: string,
  locale: SupportedLocale,
  defaultLocale = "en"
): string {
  const normalizedPathname = normalizePath(pathname);
  if (locale === defaultLocale) return normalizedPathname;
  return `/${locale}${normalizedPathname === "/" ? "" : normalizedPathname}`;
}
