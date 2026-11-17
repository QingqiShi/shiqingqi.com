import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantAuthStore } from "./assistant-auth-store.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { provenSession } from "./proven-session.ts";
import type { AssistantSession } from "./types.ts";

interface ResolvedSession {
  session: AssistantSession;
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
  db: AssistantDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return db.transaction((tx) =>
    assistantAuthStore.resolveSession<AssistantSession>(tx, token, {
      now,
      maxAgeSeconds: assistantSessionCookie.maxAgeSeconds,
      sessionOf: (session) => Promise.resolve(provenSession(session)),
      mayRefresh: () => allowRefresh,
    }),
  );
}
