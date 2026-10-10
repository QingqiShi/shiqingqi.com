import { NextResponse, type NextRequest } from "next/server";
import { financeSessionCookie } from "../auth/finance-session-cookie.ts";
import { financeSignInPath } from "../auth/finance-sign-in-path.ts";
import { isFinanceConfigured } from "../db/is-finance-configured.ts";
import { FINANCE_PATH_HEADER, FINANCE_SHELL_HEADER } from "./constants.ts";

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

const FINANCE_PATH = /^(?:\/zh)?\/finance(?:\/|$)/;
const OPEN_PATH = /^(?:\/zh)?\/finance\/(?:sign-in|invite)(?:\/|$)/;

/**
 * Finance pages behind the session: a visitor with no session cookie goes to
 * sign-in with the page as `next`, and a response for one with a cookie is
 * marked with `x-finance-shell: 1` and its request carries the page as
 * `x-finance-path`. The layout still checks the session itself; the cookie
 * can be stale, and then the layout uses that path as `next`.
 */
export function financeProxy(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (!FINANCE_PATH.test(pathname) || OPEN_PATH.test(pathname)) {
    return response;
  }
  if (response.status >= 300 && response.status < 400) return response;
  if (!request.cookies.has(financeSessionCookie.name)) {
    if (!isFinanceConfigured()) return response;
    const locale =
      pathname.startsWith("/zh/") || pathname === "/zh" ? "zh" : "en";
    const nextPath = `${pathname.replace(/^\/zh(?=\/)/, "")}${search}`;
    return NextResponse.redirect(
      new URL(financeSignInPath(locale, nextPath), request.url),
    );
  }
  response.headers.set(FINANCE_SHELL_HEADER, "1");
  setRequestHeader(
    response,
    FINANCE_PATH_HEADER,
    `${pathname.replace(/^\/zh(?=\/)/, "")}${search}`,
  );
  return response;
}
