import { eq } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import type { MailboxSession } from "#src/assistant/mail/imap/types.ts";
import {
  describeSyncError,
  type SyncErrorCode,
} from "#src/assistant/mail/sync/describe-sync-error.ts";
import { saveFolders } from "#src/assistant/mail/sync/save-folders.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "./open-mailbox-session.ts";

/** Records a failed login or run on the account; `reconnect` stops the crons until the user connects again. */
export async function recordAccountError(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: unknown,
  now: Date,
): Promise<SyncErrorCode> {
  const described = describeSyncError(error);
  await withUser(db, userId, ({ db }) =>
    db
      .update(mailAccounts)
      .set({
        status: described.status,
        lastErrorCode: described.code,
        lastErrorMessage: described.message,
        lastErrorAt: now,
      })
      .where(eq(mailAccounts.id, accountId)),
  );
  return described.code;
}

export async function recordAccountOk(
  db: AssistantDb,
  userId: string,
  accountId: string,
  now: Date,
) {
  await withUser(db, userId, ({ db }) =>
    db
      .update(mailAccounts)
      .set({
        status: "ok",
        lastSyncedAt: now,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
      })
      .where(eq(mailAccounts.id, accountId)),
  );
}

/**
 * Logs in to one account and stores its folder list with counts, so that
 * the mailboxes page shows the account as it is. It reads no mail. Null
 * when the user has no such account.
 */
export async function checkAccount(
  db: AssistantDb,
  userId: string,
  accountId: string,
  deps: MailboxDeps,
): Promise<{ ok: true } | { ok: false; code: SyncErrorCode } | null> {
  const account = (
    await withUser(db, userId, ({ db }) =>
      db
        .select({
          id: mailAccounts.id,
          provider: mailAccounts.provider,
          address: mailAccounts.address,
          credential: mailAccounts.credential,
        })
        .from(mailAccounts)
        .where(eq(mailAccounts.id, accountId)),
    )
  ).at(0);
  if (!account) return null;
  const now = deps.auth.now;
  let session: MailboxSession | null = null;
  try {
    session = await openMailboxSession(db, userId, account, deps);
    const listed = await session.listFolders();
    await withUser(db, userId, (scope) =>
      saveFolders(scope, account.id, listed, now()),
    );
    await recordAccountOk(db, userId, account.id, now());
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: await recordAccountError(db, userId, account.id, error, now()),
    };
  } finally {
    await session?.close().catch(() => undefined);
  }
}
