import { keepLocalePreference } from "@tuja/i18n/keep-locale-preference";
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

// The service worker precaches the English offline page at this URL. The
// locale router sends `/en/…` to `/…`, and `/…` to `/zh/…` for a Chinese
// browser, so a redirect here can store the page of the wrong locale.
const ENGLISH_OFFLINE_PATH = "/en/~offline";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === ENGLISH_OFFLINE_PATH) return NextResponse.next();
  return (
    (await lockedTripResponse(req)) ??
    keepLocalePreference(req, i18nRouter(req, i18nConfig))
  );
}
