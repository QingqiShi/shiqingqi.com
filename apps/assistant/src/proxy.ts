import { keepLocalePreference } from "@tuja/i18n/keep-locale-preference";
import { NextResponse, type NextRequest } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { assistantProxy } from "#src/assistant/http/assistant-proxy.ts";
import { MAIL_IMAGE_PATH } from "#src/assistant/mail/images/mail-image-path.ts";
import { ALLOWED_REFERER } from "#src/constants.ts";
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

// The browser comes back to an OAuth callback from the provider's site, with
// its Referer or none. The handler checks the state in the sealed connect
// cookie instead.
const OAUTH_CALLBACK_PATH = /^\/api\/connect\/[a-z]+\/callback$/;

// An iOS Shortcut sends no Referer. The handler checks the capture token
// instead, and that token can only add a to-do. This is one exact path, because
// a wider pattern can let session routes through.
const CAPTURE_PATH = "/api/todos/capture";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // The mail frame has an opaque origin and sends no Referer. The handler
  // checks the signature of the link instead, and a link can only fetch one
  // image that this app put in a mail page.
  if (
    pathname === CAPTURE_PATH ||
    pathname === MAIL_IMAGE_PATH ||
    pathname.startsWith(CRON_PATH_PREFIX) ||
    OAUTH_CALLBACK_PATH.test(pathname)
  ) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return validateReferer(request) ?? NextResponse.next();
  }

  const response = await assistantProxy(
    request,
    i18nRouter(request, i18nConfig),
  );

  return keepLocalePreference(request, response);
}

export const config = {
  matcher: ["/((?!static|.*\\..*|_next).*)"],
};
