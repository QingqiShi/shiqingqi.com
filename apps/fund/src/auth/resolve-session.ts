import { runTransaction } from "@tuja/server-db/run-transaction";
import type { FundDb } from "#src/db/types.ts";
import { fundAuthStore } from "./fund-auth-store.ts";
import { fundSessionCookie } from "./fund-session-cookie.ts";
import type { FundSession } from "./types.ts";

interface ResolvedSession {
  session: FundSession;
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
  db: FundDb,
  token: string,
  { now, allowRefresh }: ResolveSessionOptions,
): Promise<ResolvedSession | null> {
  return runTransaction(db, (tx) =>
    fundAuthStore.resolveSession<FundSession>(tx, token, {
      now,
      maxAgeSeconds: fundSessionCookie.maxAgeSeconds,
      sessionOf: (session) => Promise.resolve(session),
      mayRefresh: () => allowRefresh,
    }),
  );
}
