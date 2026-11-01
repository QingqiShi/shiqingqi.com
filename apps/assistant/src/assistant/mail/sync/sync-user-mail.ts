import { inArray, ne, sql } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { syncAccount, type SyncDeps } from "./sync-account.ts";

/** Gets the `live` mail that one sync stored. The classifier hooks in here. */
export type NewMailHandler = (input: {
  db: AssistantDb;
  userId: string;
  messageIds: string[];
  endsAt: number;
}) => Promise<void>;

export interface SyncUserMailDeps extends SyncDeps {
  onNewMail?: NewMailHandler;
}

export interface SyncUserMailResult {
  accounts: number;
  failed: number;
  newMessages: number;
}

/**
 * Syncs a user's accounts one after another until `endsAt`. Without
 * `accountIds` it skips the accounts that wait for a new connect.
 */
export async function syncUserMail(
  {
    db,
    userId,
    endsAt,
    now,
    accountIds,
  }: {
    db: AssistantDb;
    userId: string;
    endsAt: number;
    now: () => Date;
    accountIds?: readonly string[];
  },
  deps: SyncUserMailDeps,
): Promise<SyncUserMailResult> {
  const accounts = await withUser(db, userId, ({ db }) =>
    db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
      })
      .from(mailAccounts)
      .where(
        accountIds
          ? inArray(mailAccounts.id, [...accountIds])
          : ne(mailAccounts.status, "reconnect"),
      )
      .orderBy(sql`${mailAccounts.lastSyncedAt} asc nulls first`),
  );
  const result: SyncUserMailResult = { accounts: 0, failed: 0, newMessages: 0 };
  for (const account of accounts) {
    if (now().getTime() >= endsAt) break;
    const synced = await syncAccount({ db, userId, account, endsAt }, deps);
    result.accounts += 1;
    if (!synced.ok) {
      result.failed += 1;
      continue;
    }
    result.newMessages += synced.newMessageIds.length;
    if (synced.newMessageIds.length > 0 && deps.onNewMail) {
      await deps.onNewMail({
        db,
        userId,
        messageIds: synced.newMessageIds,
        endsAt,
      });
    }
  }
  return result;
}
