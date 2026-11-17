import { hashToken } from "@tuja/server-auth/hash-token";
import { lookups } from "#src/finance/db/lookups.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";

/** The open invite of a token, or null (see `lookups.inviteByToken`). */
export function lookupInvite(db: FinanceDb, token: string, now: Date) {
  return asFinanceApp(db, (tx) =>
    lookups.inviteByToken(tx, hashToken(token), now),
  );
}
