import type { SupportedLocale } from "#src/types.ts";
import { normalizePath } from "./normalize-path";

export function getLocalePath(
  pathname: string | null,
  locale: SupportedLocale,
  defaultLocale = "en",
): string {
  const normalizedPathname = normalizePath(pathname);
  if (locale === defaultLocale) return normalizedPathname;
  return `/${locale}${normalizedPathname === "/" ? "" : normalizedPathname}`;
}
