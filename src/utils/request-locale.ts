import { cookies } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE_NAME } from "@/constants";
import type { SupportedLocale } from "@/types";

// See https://github.com/vercel/next.js/discussions/58862
function getCacheImpl() {
  const value: { locale?: SupportedLocale } = { locale: undefined };
  return value;
}

const getCache = cache(getCacheImpl);

function getCachedRequestLocale() {
  return getCache().locale;
}

export function setCachedRequestLocale(locale: SupportedLocale) {
  getCache().locale = locale;
}

export async function getRequestLocale() {
  const cachedLocale = getCachedRequestLocale();
  if (cachedLocale) {
    return cachedLocale;
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return locale as SupportedLocale;
}
