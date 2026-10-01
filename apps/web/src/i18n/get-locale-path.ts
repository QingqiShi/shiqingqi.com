import { normalizePath } from "./normalize-path";
import type { SupportedLocale } from "./types.ts";

export function getLocalePath(
  pathname: string | null,
  locale: SupportedLocale,
  defaultLocale = "en",
): string {
  const normalizedPathname = normalizePath(pathname);
  if (locale === defaultLocale) return normalizedPathname;
  return `/${locale}${normalizedPathname === "/" ? "" : normalizedPathname}`;
}
