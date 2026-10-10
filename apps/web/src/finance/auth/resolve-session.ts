import { and, asc, eq, isNull } from "drizzle-orm";
import { members, sessions } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import { hashToken } from "./hash-token.ts";
import type { FinanceSession } from "./types.ts";

const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_SEEN_PRECISION_MS = 60 * 60 * 1000;

interface ResolvedSession {
  session: FinanceSession;
  /** True when the caller must send the session cookie again. */
  refreshed: boolean;
}

interface ResolveSessionOptions {
  now: Date;
  /** False where the caller cannot set a cookie, e.g. a server component. */
  allowRefresh: boolean;
}

export async function resolveSession(
  db: FinanceDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  const row = (
    await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        refreshedAt: sessions.refreshedAt,
        lastSeenAt: sessions.lastSeenAt,
        expiresAt: sessions.expiresAt,
        householdId: members.householdId,
        memberId: members.id,
        role: members.role,
      })
      .from(sessions)
      .innerJoin(
        members,
        and(eq(members.userId, sessions.userId), isNull(members.deletedAt)),
      )
      .where(eq(sessions.tokenHash, hashToken(token)))
      .orderBy(asc(members.createdAt))
      .limit(1)
  ).at(0);
  if (!row) return null;

  if (row.expiresAt.getTime() <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  const refreshed =
    allowRefresh &&
    now.getTime() - row.refreshedAt.getTime() >= REFRESH_AFTER_MS;
  if (refreshed) {
    await db
      .update(sessions)
      .set({
        refreshedAt: now,
        lastSeenAt: now,
        expiresAt: new Date(
          now.getTime() + financeSessionCookie.maxAgeSeconds * 1000,
        ),
      })
      .where(eq(sessions.id, row.sessionId));
  } else if (
    now.getTime() - row.lastSeenAt.getTime() >=
    LAST_SEEN_PRECISION_MS
  ) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    session: {
      sessionId: row.sessionId,
      userId: row.userId,
      householdId: row.householdId,
      memberId: row.memberId,
      role: row.role,
    },
    refreshed,
  };
}
