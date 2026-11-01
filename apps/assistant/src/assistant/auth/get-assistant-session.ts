import { cookies } from "next/headers";
import "server-only";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { isAssistantConfigured } from "#src/assistant/db/is-assistant-configured.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { getRequestOrigin } from "./get-request-origin.ts";
import { needsSecureCookie } from "./needs-secure-cookie.ts";
import { readRequestCookie } from "./read-request-cookie.ts";
import { resolveSession } from "./resolve-session.ts";
import type { AssistantSession } from "./types.ts";

interface GetAssistantSessionDeps {
  /** Null when the app has no database. */
  getDb: () => AssistantDb | null;
  now: () => Date;
  /** Sends the session cookie again with a new Max-Age. */
  reissueCookie: (token: string, secure: boolean) => Promise<void>;
}

export function makeGetAssistantSession(deps: GetAssistantSessionDeps) {
  return async function getAssistantSession(
    request: Request,
  ): Promise<AssistantSession | null> {
    const db = deps.getDb();
    const token = readRequestCookie(request, assistantSessionCookie.name);
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
export const getAssistantSession = makeGetAssistantSession({
  getDb: () => (isAssistantConfigured() ? getAssistantDb() : null),
  now: () => new Date(),
  reissueCookie: async (token, secure) => {
    (await cookies()).set(assistantSessionCookie.name, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: assistantSessionCookie.maxAgeSeconds,
    });
  },
});
