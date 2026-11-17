import type { TripsDb } from "#src/db/types.ts";
import { tripsAuthStore } from "./trips-auth-store.ts";
import { tripsSessionCookie } from "./trips-session-cookie.ts";
import type { TripsSession } from "./types.ts";

interface ResolvedSession {
  session: TripsSession;
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
  db: TripsDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return db.transaction((tx) =>
    tripsAuthStore.resolveSession<TripsSession>(tx, token, {
      now,
      maxAgeSeconds: tripsSessionCookie.maxAgeSeconds,
      sessionOf: (session) => Promise.resolve(session),
      mayRefresh: () => allowRefresh,
    }),
  );
}
