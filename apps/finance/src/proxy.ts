import { keepLocalePreference } from "@tuja/i18n/keep-locale-preference";
import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { ALLOWED_REFERER } from "#src/constants.ts";
import { financeProxy } from "#src/finance/http/finance-proxy.ts";
import { i18nConfig } from "#src/i18n/i18n-config.ts";

function isAllowedDevHost(request: NextRequest, refererUrl: URL): boolean {
  // Next inlines this from `env` in next.config.js; it is empty outside
  // development.
  const allowedDevHosts =
    process.env.ALLOWED_DEV_ORIGINS?.split(",").filter(Boolean) ?? [];
  // The page calls the dev server it came from. Compare the Host header, not
  // `request.nextUrl`: in development Next builds that from its listen port.
  const host = request.headers.get("Host")?.toLowerCase();
  return (
    refererUrl.host === host && allowedDevHosts.includes(refererUrl.hostname)
  );
}

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
    const isAllowed =
      isLocalhost ||
      allowedOrigins.includes(refererUrl.origin) ||
      isAllowedDevHost(request, refererUrl);
    if (!isAllowed) {
      throw new Error("Unauthorized");
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return null;
}

// Vercel Cron sends no Referer. Each handler under this path must check the
// `CRON_SECRET` bearer token instead.
const CRON_PATH_PREFIX = "/api/cron/";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(CRON_PATH_PREFIX)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return validateReferer(request) ?? NextResponse.next();
  }

  const response = financeProxy(request, i18nRouter(request, i18nConfig));

  return keepLocalePreference(request, response);
}

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
