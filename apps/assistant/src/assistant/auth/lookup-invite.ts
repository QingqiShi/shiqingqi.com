import { and, eq, gt, isNull } from "drizzle-orm";
import { invites } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { asAssistantApp } from "#src/assistant/db/with-user.ts";
import { hashToken } from "./hash-token.ts";

/**
 * The open invite of a token at `now`: not used and not expired, or null.
 * `recoveryUserId` is the user it lets back in, null when it makes a new user.
 */
export async function lookupInvite(db: AssistantDb, token: string, now: Date) {
  const rows = await asAssistantApp(db, (tx) =>
    tx
      .select({
        inviteId: invites.id,
        displayName: invites.displayName,
        recoveryUserId: invites.recoveryUserId,
      })
      .from(invites)
      .where(
        and(
          eq(invites.tokenHash, hashToken(token)),
          isNull(invites.usedAt),
          gt(invites.expiresAt, now),
        ),
      )
      .limit(1),
  );
  return rows.at(0) ?? null;
}
