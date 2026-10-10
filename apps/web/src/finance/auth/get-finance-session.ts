import { cookies } from "next/headers";
import "server-only";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { FinanceSession } from "./types.ts";

interface GetFinanceSessionDeps {
  /** Null when finance has no database. */
  getDb: () => FinanceDb | null;
  now: () => Date;
  /** Sends the session cookie again with a new Max-Age. */
  reissueCookie: (token: string, secure: boolean) => Promise<void>;
}

export function makeGetFinanceSession(deps: GetFinanceSessionDeps) {
  return async function getFinanceSession(
    request: Request,
  ): Promise<FinanceSession | null> {
    const db = deps.getDb();
    const token = readRequestCookie(request, financeSessionCookie.name);
    if (!db || !token) return null;
    const resolved = await resolveSession(db, token, {
      now: deps.now(),
      allowRefresh: true,
    });
    if (!resolved) return null;
    if (resolved.refreshed) {
      await deps.reissueCookie(
        token,
        needsSecureCookie(getRequestOrigin(request)),
      );
    }
    return resolved.session;
  };
}

/** For route handlers. Renews the cookie through `cookies()` when due. */
export const getFinanceSession = makeGetFinanceSession({
  getDb: () => (isFinanceConfigured() ? getFinanceDb() : null),
  now: () => new Date(),
  reissueCookie: async (token, secure) => {
    (await cookies()).set(financeSessionCookie.name, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: financeSessionCookie.maxAgeSeconds,
    });
  },
});
