import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import type { MailboxSession } from "#src/assistant/mail/imap/types.ts";
import {
  describeSyncError,
  type SyncErrorCode,
} from "./describe-sync-error.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "./open-mailbox-session.ts";
import { ownAccount } from "./own-account.ts";

/** Records a failed login or run on the account; `reconnect` stops the crons until the user connects again. */
export async function recordAccountError(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: unknown,
  now: Date,
): Promise<SyncErrorCode> {
  const described = describeSyncError(error);
  await db
    .update(mailAccounts)
    .set({
      status: described.status,
      lastErrorCode: described.code,
      lastErrorMessage: described.message,
      lastErrorAt: now,
    })
    .where(ownAccount(userId, accountId));
  return described.code;
}

export async function recordAccountOk(
  db: AssistantDb,
  userId: string,
  accountId: string,
  now: Date,
) {
  await db
    .update(mailAccounts)
    .set({
      status: "ok",
      lastSyncedAt: now,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastErrorAt: null,
    })
    .where(ownAccount(userId, accountId));
}

/**
 * Logs in to one account and reads its folder list, so that the mailboxes
 * page shows whether the login works. It reads no mail. Null when the user
 * has no such account.
 */
export async function checkAccount(
  db: AssistantDb,
  userId: string,
  accountId: string,
  deps: MailboxDeps,
): Promise<{ ok: true } | { ok: false; code: SyncErrorCode } | null> {
  const account = (
    await db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
      })
      .from(mailAccounts)
      .where(ownAccount(userId, accountId))
  ).at(0);
  if (!account) return null;
  const now = deps.auth.now;
  let session: MailboxSession | null = null;
  try {
    session = await openMailboxSession(db, userId, account, deps);
    await session.listFolders();
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
