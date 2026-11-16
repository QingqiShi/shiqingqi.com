import { lookups } from "#src/finance/db/lookups.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";
import { financeAuthStore } from "./finance-auth-store.ts";
import { financeSessionCookie } from "./finance-session-cookie.ts";
import type { FinanceSession } from "./types.ts";

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

/** The session of a token and the user's oldest live membership, or null. The demo's session is not renewed. */
export function resolveSession(
  db: FinanceDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return asFinanceApp(db, (tx) =>
    financeAuthStore.resolveSession<FinanceSession>(tx, token, {
      now,
      maxAgeSeconds: financeSessionCookie.maxAgeSeconds,
      sessionOf: async ({ sessionId, userId }) => {
        const membership = (await lookups.membershipsOfUser(tx, userId)).at(0);
        return membership
          ? {
              sessionId,
              userId,
              householdId: membership.householdId,
              memberId: membership.memberId,
              role: membership.role,
              readOnly: membership.demo,
            }
          : null;
      },
      mayRefresh: (session) => allowRefresh && !session.readOnly,
    }),
  );
}

/**
 * The user of a token when the user is a Member of no Household, or null.
 * Such a user has only the first-run screen and an invite to accept.
 */
export function resolveNewUser(
  db: FinanceDb,
  token: string,
  now: Date,
): Promise<{ userId: string } | null> {
  return asFinanceApp(db, async (tx) => {
    const resolved = await financeAuthStore.resolveSession(tx, token, {
      now,
      maxAgeSeconds: financeSessionCookie.maxAgeSeconds,
      sessionOf: async ({ userId }) =>
        (await lookups.membershipsOfUser(tx, userId)).length === 0
          ? { userId }
          : null,
      mayRefresh: () => false,
    });
    return resolved?.session ?? null;
  });
}
