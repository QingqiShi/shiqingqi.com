import { hashToken } from "@tuja/server-auth/hash-token";
import { lookups } from "#src/finance/db/lookups.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { asFinanceApp } from "#src/finance/db/with-household.ts";

/** The open invite of a token, or null (see `lookups.inviteByToken`). */
export async function lookupInvite(db: FinanceDb, token: string, now: Date) {
  const invite = await asFinanceApp(db, (tx) =>
    lookups.inviteByToken(tx, hashToken(token), now),
  );
  // An invite with a recovery user is from the time when a recovery was an
  // invite. A recovery has a link of its own now, so such an invite has ended.
  return invite?.recoveryUserId === null ? invite : null;
}
