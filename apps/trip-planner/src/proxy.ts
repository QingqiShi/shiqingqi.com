import { keepLocalePreference } from "@tuja/i18n/keep-locale-preference";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nConfig } from "./i18n/i18n-config";

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

// The service worker precaches the English offline page at this URL. The
// locale router sends `/en/…` to `/…`, and `/…` to `/zh/…` for a Chinese
// browser, so a redirect here can store the page of the wrong locale.
const ENGLISH_OFFLINE_PATH = "/en/~offline";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // An API route checks its own credentials and has no locale.
  if (pathname.startsWith("/api/") || pathname === ENGLISH_OFFLINE_PATH) {
    return NextResponse.next();
  }
  return keepLocalePreference(req, i18nRouter(req, i18nConfig));
}
