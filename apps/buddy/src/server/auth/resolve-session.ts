import type { BuddyDb } from "#src/server/db/types.ts";
import { buddyAuthStore } from "./buddy-auth-store.ts";
import { buddySessionCookie } from "./buddy-session-cookie.ts";
import type { BuddySession } from "./types.ts";

interface ResolvedSession {
  session: BuddySession;
  /** True when the caller must send the session cookie again. */
  refreshed: boolean;
}

interface ResolveSessionOptions {
  now: Date;
  /** False where the caller cannot set a cookie, e.g. a server component. */
  allowRefresh: boolean;
}

/** The live session of a token, or null. */
export function resolveSession(
  db: BuddyDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return db.transaction((tx) =>
    buddyAuthStore.resolveSession<BuddySession>(tx, token, {
      now,
      maxAgeSeconds: buddySessionCookie.maxAgeSeconds,
      sessionOf: (session) => Promise.resolve(session),
      mayRefresh: () => allowRefresh,
    }),
  );
}
