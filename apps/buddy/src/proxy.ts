import { keepLocalePreference } from "@tuja/i18n/keep-locale-preference";
import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nConfig } from "#src/i18n/i18n-config.ts";

// Every API route is public or checks its own credentials: the read API and
// the Mac's connect calls are public, an upload carries a signature, a cron
// request carries the `CRON_SECRET` bearer token, and the owner's POSTs check
// the Origin and the session. So no Referer check applies here.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const response = i18nRouter(request, i18nConfig);

  return keepLocalePreference(request, response);
}

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
