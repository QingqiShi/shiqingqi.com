import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "@tuja/i18n/constants";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nConfig } from "#src/i18n/i18n-config.ts";

// Next deletes its `RSC` and `Next-Router-Prefetch` headers before the proxy
// runs, so `Sec-Fetch-Dest` and `Sec-Purpose` are the only signals left.
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

// Every API route is public or checks its own credentials: the read API and
// the Mac's connect calls are public, an upload carries a signature, a cron
// request carries the `CRON_SECRET` bearer token, and the owner's POSTs check
// the Origin and the session. So no Referer check applies here.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = i18nRouter(request, i18nConfig);

  // Only a document load may change the Preference: it is the one URL the
  // visitor chose. next-i18n-router writes NEXT_LOCALE on every locale-prefixed
  // path, and the re-issue below echoes the cookie the request carried — a
  // request sent before the picker wrote the new Preference still carries the
  // old one, and on production that echo alone reverted `en` to `zh`.
  if (!isDocumentRequest(request)) {
    // Only i18nRouter has touched this response, and it writes at most the
    // Locale cookie. `x-middleware-set-cookie` is Next's mirror of the
    // middleware's cookies that the render reads back. So the rule is: a
    // request that is not a document load writes no cookie.
    response.headers.delete("set-cookie");
    response.headers.delete("x-middleware-set-cookie");
    return response;
  }

  // Client-set cookies are capped at 7 days by Safari/Brave, and
  // next-i18n-router only refreshes NEXT_LOCALE on locale-prefixed paths —
  // default-locale traffic is served by rewrite and never touches it. Re-issue
  // the cookie here so an expressed Preference doesn't decay to
  // Accept-Language. Skip it when the library already set one itself: that
  // reflects an actual Locale change and must win.
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

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
