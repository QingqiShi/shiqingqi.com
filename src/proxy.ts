import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { ALLOWED_REFERER } from "#src/constants.ts";
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
    const isAllowedReferer = ALLOWED_REFERER.some((allowedReferer) =>
      refererUrl.origin.endsWith(allowedReferer),
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

  const i18nResponse = i18nRouter(request, i18nConfig);

  // Redirects (e.g. stripping default locale prefix) — return as-is
  if (i18nResponse.headers.has("location")) {
    return i18nResponse;
  }

  // For non-redirect responses, forward the detected locale as a request
  // header so that server components (including the root not-found page)
  // can read it via headers().
  const pathname = request.nextUrl.pathname;
  const locale =
    i18nConfig.locales.find(
      (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
    ) ?? i18nConfig.defaultLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Preserve cookies set by i18nRouter (e.g. NEXT_LOCALE)
  for (const cookie of i18nResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  return response;
}

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
