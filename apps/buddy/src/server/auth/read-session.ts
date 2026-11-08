import type { BuddyDb } from "#src/server/db/types.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { BuddySession } from "./types.ts";

/**
 * The live session of a route request, or null. `setCookie` is the renewed
 * session cookie when the session was due for a renewal; the route sends it.
 */
export async function readSession(
  db: BuddyDb,
  request: Request,
  now: Date,
): Promise<{ session: BuddySession; setCookie: string | null } | null> {
  const token = readRequestCookie(request, buddySessionCookie.name);
  if (!token) return null;
  const resolved = await resolveSession(db, token, {
    now,
    allowRefresh: true,
  });
  if (!resolved) return null;
  return {
    session: resolved.session,
    setCookie: resolved.refreshed
      ? buddySessionCookie.serialize(
          token,
          needsSecureCookie(getRequestOrigin(request)),
        )
      : null,
  };
}
