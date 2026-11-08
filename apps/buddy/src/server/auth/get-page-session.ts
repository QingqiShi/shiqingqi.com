import { cookies } from "next/headers";
import "server-only";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { BuddySession } from "./types.ts";

/**
 * For server components. A server component cannot set a cookie, so this
 * never renews the session; the next API request does.
 */
export async function getPageSession(): Promise<BuddySession | null> {
  const db = getBuddyDb();
  if (!db) return null;
  const token = (await cookies()).get(buddySessionCookie.name)?.value;
  if (!token) return null;
  const resolved = await resolveSession(db, token, {
    now: new Date(),
    allowRefresh: false,
  });
  return resolved?.session ?? null;
}
