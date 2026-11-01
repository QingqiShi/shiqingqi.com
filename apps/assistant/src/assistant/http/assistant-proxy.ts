import { NextResponse, type NextRequest } from "next/server";
import { assistantSessionCookie } from "../auth/assistant-session-cookie.ts";
import { signInPath } from "../auth/sign-in-path.ts";
import { isAssistantConfigured } from "../db/is-assistant-configured.ts";
import { ASSISTANT_PATH_HEADER } from "./constants.ts";

const OVERRIDE_HEADERS = "x-middleware-override-headers";

/** Adds a request header the way `NextResponse.next({ request })` does, on a response another router made. */
function setRequestHeader(response: NextResponse, name: string, value: string) {
  const overrides = response.headers.get(OVERRIDE_HEADERS);
  if (overrides === null) return;
  const names = overrides.split(",").filter(Boolean);
  if (!names.includes(name)) names.push(name);
  response.headers.set(OVERRIDE_HEADERS, names.join(","));
  response.headers.set(`x-middleware-request-${name}`, value);
}

/** The pages anyone may open: sign-in, invites, and the legal pages that the OAuth consent screens link to. */
const OPEN_PATH = /^(?:\/zh)?\/(?:sign-in|invite|privacy|terms)(?:\/|$)/;

/** `pathname` without its locale prefix: `/zh/settings` is `/settings`, and `/zh` is `/`. */
function withoutLocale(pathname: string) {
  return pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
}

/**
 * Pages behind the session: a visitor with no session cookie goes to
 * sign-in with the page as `next`, and the request of one with a cookie
 * carries the page as `x-assistant-path`. The layout still checks the
 * session itself; the cookie can be stale.
 */
export function assistantProxy(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (OPEN_PATH.test(pathname)) return response;
  if (response.status >= 300 && response.status < 400) return response;
  if (!request.cookies.has(assistantSessionCookie.name)) {
    if (!isAssistantConfigured()) return response;
    const locale =
      pathname.startsWith("/zh/") || pathname === "/zh" ? "zh" : "en";
    return NextResponse.redirect(
      new URL(
        signInPath(locale, `${withoutLocale(pathname)}${search}`),
        request.url,
      ),
    );
  }
  setRequestHeader(
    response,
    ASSISTANT_PATH_HEADER,
    `${withoutLocale(pathname)}${search}`,
  );
  return response;
}
