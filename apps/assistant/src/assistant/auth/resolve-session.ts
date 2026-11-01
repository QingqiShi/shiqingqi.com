import { eq } from "drizzle-orm";
import { sessions } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { asAssistantApp } from "#src/assistant/db/with-user.ts";
import { assistantSessionCookie } from "./assistant-session-cookie.ts";
import { hashToken } from "./hash-token.ts";
import type { AssistantSession } from "./types.ts";

const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_SEEN_PRECISION_MS = 60 * 60 * 1000;

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
  return asAssistantApp(db, async (tx) => {
    const row = (
      await tx
        .select({
          sessionId: sessions.id,
          userId: sessions.userId,
          refreshedAt: sessions.refreshedAt,
          lastSeenAt: sessions.lastSeenAt,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(eq(sessions.tokenHash, hashToken(token)))
        .limit(1)
    ).at(0);
    if (!row) return null;

    if (row.expiresAt.getTime() <= now.getTime()) {
      await tx.delete(sessions).where(eq(sessions.id, row.sessionId));
      return null;
    }

    const refreshed =
      allowRefresh &&
      now.getTime() - row.refreshedAt.getTime() >= REFRESH_AFTER_MS;
    if (refreshed) {
      await tx
        .update(sessions)
        .set({
          refreshedAt: now,
          lastSeenAt: now,
          expiresAt: new Date(
            now.getTime() + assistantSessionCookie.maxAgeSeconds * 1000,
          ),
        })
        .where(eq(sessions.id, row.sessionId));
    } else if (
      now.getTime() - row.lastSeenAt.getTime() >=
      LAST_SEEN_PRECISION_MS
    ) {
      await tx
        .update(sessions)
        .set({ lastSeenAt: now })
        .where(eq(sessions.id, row.sessionId));
    }

    return {
      session: { sessionId: row.sessionId, userId: row.userId },
      refreshed,
    };
  });
}
