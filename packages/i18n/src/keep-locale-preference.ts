import type { NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "./constants.ts";
import { isValidLocale } from "./validate-locale.ts";

/**
 * True when the browser loads this URL as a document — the request the visitor
 * asked for. A fetch the app makes for itself is not one: a Link prefetch, a
 * client-router navigation, or the service worker replaying or precaching a
 * page.
 *
 * Next deletes its own `RSC` and `Next-Router-Prefetch` headers before the
 * proxy runs (see `FLIGHT_HEADERS` in next/dist/server/web/adapter.js), so the
 * browser's `Sec-Fetch-Dest` is the only signal left. A speculation-rules
 * prefetch says `document` too, and `Sec-Purpose` is what separates it. A
 * browser that sends neither keeps the earlier behaviour.
 */
function isDocumentRequest(request: NextRequest): boolean {
  if (
    ["Sec-Purpose", "Purpose"].some((name) =>
      request.headers.get(name)?.includes("prefetch"),
    )
  ) {
    return false;
  }

  const destination = request.headers.get("Sec-Fetch-Dest");
  return destination === null || destination === "document";
}

/**
 * Applies the Locale cookie rules to the response of next-i18n-router's
 * `i18nRouter`, or of an app proxy that wraps it and sets no cookie itself.
 *
 * Only a document load may change the Preference: it is the one URL the
 * visitor chose. next-i18n-router writes NEXT_LOCALE on every locale-prefixed
 * path, so a prefetch of the old Locale's links, or a service worker that
 * precaches `/zh/…`, changed the Locale of a visitor who never asked. The
 * re-issue below has the same risk: a fetch sent before the picker wrote the
 * new Preference still carries the old cookie, and on production that echo
 * alone reverted `en` to `zh`. So a request that is not a document load writes
 * no cookie at all.
 *
 * On a document load, the cookie the request carried is issued again. Safari
 * and Brave keep a cookie that script sets for 7 days at most, and
 * next-i18n-router refreshes NEXT_LOCALE only on locale-prefixed paths, so a
 * Preference would otherwise decay to Accept-Language. A cookie that the router
 * set itself reflects a real Locale change and wins.
 */
export function keepLocalePreference(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (!isDocumentRequest(request)) {
    // `x-middleware-set-cookie` is Next's mirror of the middleware's cookies
    // that the render reads back.
    response.headers.delete("set-cookie");
    response.headers.delete("x-middleware-set-cookie");
    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (
    cookieLocale &&
    isValidLocale(cookieLocale) &&
    !response.cookies.get(LOCALE_COOKIE_NAME)
  ) {
    response.cookies.set(LOCALE_COOKIE_NAME, cookieLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
