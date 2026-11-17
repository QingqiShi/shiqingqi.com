import { cookies } from "next/headers";
import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { resolveSession } from "./resolve-session.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";
import type { TripsSession } from "./types.ts";

/**
 * For server components. A server component cannot set a cookie, so this
 * never renews the session; the next API request does.
 */
export async function getPageSession(): Promise<TripsSession | null> {
  const token = (await cookies()).get(tripsSessionCookie.name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(getTripsDb(), token, {
    now: new Date(),
    allowRefresh: false,
  });
  return resolved?.session ?? null;
}
