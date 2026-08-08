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

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return validateReferer(request) ?? NextResponse.next();
  }

  const response = i18nRouter(request, i18nConfig);

  // Client-set cookies are capped at 7 days by Safari/Brave, and
  // next-i18n-router only refreshes NEXT_LOCALE on locale-prefixed paths —
  // default-locale traffic is served by rewrite and never touches it. Re-issue
  // the cookie here so an expressed preference doesn't decay to
  // Accept-Language. Skip it when the library already set one itself: that
  // reflects an actual locale change and must win.
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
