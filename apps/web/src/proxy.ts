import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import {
  ALLOWED_REFERER,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "#src/constants.ts";
import { isValidLocale } from "#src/utils/validate-locale.ts";
import { i18nConfig } from "./i18n-config";

function validateReferer(request: NextRequest): NextResponse | null {
  const referer = request.headers.get("Referer") ?? "";
  if (!referer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const refererUrl = new URL(referer);
    const isLocalhost =
      refererUrl.hostname === "localhost" && refererUrl.protocol === "http:";
    const vercelUrls = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter((url): url is string => Boolean(url))
      .map((url) => `https://${url}`);
    const allowedOrigins = [...ALLOWED_REFERER, ...vercelUrls];
    const isAllowedReferer = allowedOrigins.some(
      (allowed) => refererUrl.origin === allowed,
    );
    if (!isLocalhost && !isAllowedReferer) {
      throw new Error("Unauthorized");
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return null;
}

/**
 * True when the browser loads this URL as a document — the request the visitor
 * asked for. A fetch the app makes for itself is not one: a Link prefetch, a
 * client-router navigation, or the service worker replaying either.
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

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return validateReferer(request) ?? NextResponse.next();
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
