import { eq } from "drizzle-orm";
import { lookups } from "#src/finance/db/lookups.ts";
import { sessions } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import {
  asFinanceApp,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
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

/** The session of a token and the user's oldest live membership, or null. */
export function resolveSession(
  db: FinanceDb,
  token: string,
  options: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return asFinanceApp(db, (tx) => resolveSessionIn(tx, token, options));
}

async function resolveSessionIn(
  db: FinanceAppDb,
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
      })
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)))
      .limit(1)
  ).at(0);
  if (!row) return null;

  if (row.expiresAt.getTime() <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }
  const membership = (await lookups.membershipsOfUser(db, row.userId)).at(0);
  if (!membership) return null;

  const refreshed =
    allowRefresh &&
    !membership.demo &&
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
      householdId: membership.householdId,
      memberId: membership.memberId,
      role: membership.role,
      readOnly: membership.demo,
    },
    refreshed,
  };
}
