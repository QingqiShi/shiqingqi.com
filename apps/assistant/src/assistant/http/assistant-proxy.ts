import { signInPath } from "@tuja/server-auth/sign-in-path";
import { NextResponse, type NextRequest } from "next/server";
import { assistantSessionCookie } from "../auth/assistant-session-cookie.ts";
import { resolveSession } from "../auth/resolve-session.ts";
import { getAssistantDb } from "../db/get-assistant-db.ts";
import { isAssistantConfigured } from "../db/is-assistant-configured.ts";
import type { AssistantDb } from "../db/types.ts";
import {
  askedHomeView,
  chooseHomeView,
  homeViewHref,
} from "../home/choose-home-view.ts";
import { readUnseenReportDate } from "../home/read-home-status.ts";
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

/** The pages anyone may open: sign-in, and the legal pages that the OAuth consent screens link to. */
const OPEN_PATH = /^(?:\/zh)?\/(?:sign-in|privacy|terms)(?:\/|$)/;

/** `pathname` without its locale prefix: `/zh/settings` is `/settings`, and `/zh` is `/`. */
function withoutLocale(pathname: string) {
  return pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
}

/** The page that `/` shows without a live session. It has no address of its own. */
const PUBLIC_HOME_ROUTE = "/public-home";
/** `[...missing]` takes this path and answers 404. */
const MISSING_ROUTE = "/missing";

function rewriteToRoute(
  request: NextRequest,
  response: NextResponse,
  locale: string,
  route: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${route}`;
  const rewritten = NextResponse.rewrite(url);
  for (const cookie of response.cookies.getAll()) {
    rewritten.cookies.set(cookie);
  }
  return rewritten;
}

interface AssistantProxyDeps {
  /** Null when the app has no database. */
  getDb: () => AssistantDb | null;
  now: () => Date;
}

/**
 * Pages behind the session: a visitor with no session cookie goes to
 * sign-in with the page as `next`, and the request of one with a cookie
 * carries the page as `x-assistant-path`. The layout still checks the
 * session itself; the cookie can be stale.
 *
 * `/` is the exception, and it is the one path that reads the session here:
 * without a live session it shows the public home page at the same address,
 * and with one but no `view` it redirects to the view that Home chooses.
 */
export function makeAssistantProxy({ getDb, now }: AssistantProxyDeps) {
  /** The user of a live session; `userId` is null when the database failed. */
  async function liveSessionOf(
    db: AssistantDb,
    token: string | undefined,
  ): Promise<{ userId: string | null } | null> {
    if (!token) return null;
    try {
      const resolved = await resolveSession(db, token, {
        now: now(),
        allowRefresh: false,
      });
      return resolved ? { userId: resolved.session.userId } : null;
    } catch {
      // Home reads the session again and shows the error screen. An error in
      // the proxy gives a bare 500.
      return { userId: null };
    }
  }

  /**
   * The address of the view that bare `/` chooses, or null when `/` names a
   * view or the choice must wait for the page. The proxy chooses before the
   * page streams, so the browser follows the redirect before it paints.
   */
  async function homeViewAddress(
    request: NextRequest,
    db: AssistantDb,
    userId: string,
    locale: "en" | "zh",
  ) {
    const asked = request.nextUrl.searchParams.get("view") ?? undefined;
    if (askedHomeView(asked) !== null) return null;
    try {
      const unseenReportDate = await readUnseenReportDate({ db, userId });
      return homeViewHref(chooseHomeView({ unseenReportDate }), locale);
    } catch {
      return null;
    }
  }

  return async function assistantProxy(
    request: NextRequest,
    response: NextResponse,
  ): Promise<NextResponse> {
    const { pathname, search } = request.nextUrl;
    if (OPEN_PATH.test(pathname)) return response;
    if (response.status >= 300 && response.status < 400) return response;
    const locale =
      pathname.startsWith("/zh/") || pathname === "/zh" ? "zh" : "en";
    const path = withoutLocale(pathname);
    if (path === PUBLIC_HOME_ROUTE) {
      return rewriteToRoute(request, response, locale, MISSING_ROUTE);
    }
    const sessionCookie = request.cookies.get(assistantSessionCookie.name);
    const db = getDb();
    if (path === "/" && db) {
      const live = await liveSessionOf(db, sessionCookie?.value);
      if (!live) {
        return rewriteToRoute(request, response, locale, PUBLIC_HOME_ROUTE);
      }
      const address =
        live.userId === null
          ? null
          : await homeViewAddress(request, db, live.userId, locale);
      if (address) {
        const redirect = NextResponse.redirect(new URL(address, request.url));
        for (const cookie of response.cookies.getAll()) {
          redirect.cookies.set(cookie);
        }
        return redirect;
      }
    }
    if (!sessionCookie) {
      if (!db) return response;
      return NextResponse.redirect(
        new URL(signInPath(locale, `${path}${search}`), request.url),
      );
    }
    setRequestHeader(response, ASSISTANT_PATH_HEADER, `${path}${search}`);
    return response;
  };
}

export const assistantProxy = makeAssistantProxy({
  getDb: () => (isAssistantConfigured() ? getAssistantDb() : null),
  now: () => new Date(),
});
