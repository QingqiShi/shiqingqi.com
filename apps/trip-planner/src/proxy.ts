import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
} from "@tuja/i18n/constants";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { i18nRouter } from "next-i18n-router";
import { i18nConfig } from "#src/i18n/i18n-config.ts";
import { isTripUnlocked, tripGate } from "./trip-gate";

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
// The trip page checks the unlock again, so a path that this proxy reads
// differently from the router still cannot show a trip.
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};

interface TripPath {
  locale: SupportedLocale;
  slug: string | undefined;
}

// The router decodes each segment and ignores empty ones, so read the path the
// same way: `/%67b`, `//gb` and `/zh/gb/` all name the trip `gb`.
function readTripPath(pathname: string): TripPath | null {
  let segments: string[];
  try {
    segments = pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
  const first = segments.at(0);
  if (first !== undefined && isValidLocale(first)) {
    return { locale: first, slug: segments.at(1) };
  }
  return { locale: "en", slug: first };
}

async function gateResponse(req: NextRequest): Promise<NextResponse | null> {
  const tripPath = readTripPath(req.nextUrl.pathname);
  if (!tripPath) {
    return new NextResponse("Bad request", { status: 400 });
  }
  const { locale, slug } = tripPath;
  const gate = slug === undefined ? undefined : tripGate(slug);

  // Not a trip route (the picker, the unlock form, 404s…) — nothing to gate.
  if (slug === undefined || !gate) return null;

  // Fail closed: never serve a trip if its gate is misconfigured.
  if (!gate.password) {
    return new NextResponse("Auth not configured", { status: 503 });
  }

  // Already unlocked (this or a previous session) — let the trip through.
  if (await isTripUnlocked(slug, req.cookies)) return null;

  // Locked: send the visitor to this trip's unlock form, in the same locale.
  // A successful unlock sets the cookie and returns them to the trip.
  const unlock = getLocalePath(`/unlock/${slug}`, locale);
  return NextResponse.redirect(
    new URL(`${unlock}${req.nextUrl.search}`, req.url),
  );
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

export async function proxy(req: NextRequest) {
  const locked = await gateResponse(req);
  if (locked) return locked;

  // Files (the service worker, icons, the manifest, fonts) and Next's own
  // routes have no locale.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  return localeResponse(req);
}
