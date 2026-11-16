import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "@tuja/i18n/constants";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nConfig } from "./i18n/i18n-config";
import { gateToken, tripGate } from "./trip-gate";

// Gate each trip behind its own password so an itinerary is only readable by
// the people on that trip. The home picker stays open — it reveals nothing
// beyond trip titles and dates — and static assets and robots.txt stay public.
//
// Locked trips are sent to an in-app unlock form (`/unlock/<slug>`) instead of
// an HTTP Basic Auth challenge. Basic Auth let the browser cache one trip's
// credentials and re-send them to every same-origin request — which silently
// unlocked the other trip and popped a password dialog on the public homepage
// (where the trip links were prefetched then). A form-plus-cookie flow keeps each
// trip's unlock to itself and never prompts on a page the visitor can read.
//
// The trip page checks the cookie too (`isTripUnlocked`), so this gate is the
// fast path, not the only one.
export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};

const LOCALE_PREFIX = /^\/(?:en|zh)(?=\/|$)/;

function firstSegment(path: string): string {
  const segment = path.split("/")[1] ?? "";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function lockedTripResponse(
  req: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const prefix = LOCALE_PREFIX.exec(pathname)?.[0] ?? "";
  const slug = firstSegment(pathname.slice(prefix.length));
  const gate = tripGate(slug);

  // Not a trip route (the picker, the unlock form, 404s…) — nothing to gate.
  if (!gate) return null;

  // Fail closed: never serve a trip if its gate is misconfigured.
  if (!gate.password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  // Already unlocked (this or a previous session) — let the trip through.
  const expected = await gateToken(gate.realm, gate.password);
  if (req.cookies.get(gate.cookie)?.value === expected) return null;

  // Locked: send the visitor to this trip's unlock form, in the same
  // language. A successful unlock sets the cookie and returns them here.
  const unlock = req.nextUrl.clone();
  unlock.pathname = `${prefix === "/zh" ? "/zh" : ""}/unlock/${slug}`;
  unlock.search = "";
  return NextResponse.redirect(unlock);
}

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

function localeResponse(request: NextRequest): NextResponse {
  const response = i18nRouter(request, i18nConfig);

  // Only a document load may change the Locale: it is the one URL the visitor
  // chose. next-i18n-router writes NEXT_LOCALE on every locale-prefixed path,
  // and the service worker fetches `/zh/~offline` for every visitor, which
  // turned an English visitor's next page Chinese.
  if (!isDocumentRequest(request)) {
    // `x-middleware-set-cookie` is Next's mirror of the middleware's cookies
    // that the render reads back.
    response.headers.delete("set-cookie");
    response.headers.delete("x-middleware-set-cookie");
    return response;
  }

  // Safari and Brave keep a cookie that script sets for 7 days at most, and
  // next-i18n-router refreshes NEXT_LOCALE only on locale-prefixed paths.
  // Issue the cookie again, unless the router set a new one itself.
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

// The service worker precaches the English offline page at this URL. The
// locale router sends `/en/…` to `/…`, and `/…` to `/zh/…` for a Chinese
// browser, so a redirect here can store the page of the wrong locale.
const ENGLISH_OFFLINE_PATH = "/en/~offline";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === ENGLISH_OFFLINE_PATH) return NextResponse.next();
  return (await lockedTripResponse(req)) ?? localeResponse(req);
}
