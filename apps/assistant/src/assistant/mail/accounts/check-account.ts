import { sql } from "drizzle-orm";
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

/** How long a server may refuse fresh tokens before the account asks for a new connect. */
export const SESSION_REFUSED_LIMIT_MS = 24 * 60 * 60 * 1000;

/**
 * Records a failed login or run on the account; `reconnect` stops the crons
 * until the user connects again. A `session_refused` account that has not
 * opened for `SESSION_REFUSED_LIMIT_MS` becomes `login_refused`: the refusal
 * is not a passing one, and the connect flow shows the server's answer at once.
 */
export async function recordAccountError(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: unknown,
  now: Date,
): Promise<SyncErrorCode> {
  const described = describeSyncError(error);
  if (described.code === "session_refused") {
    const limit = new Date(now.getTime() - SESSION_REFUSED_LIMIT_MS);
    const overLimit = sql`coalesce(${mailAccounts.lastSyncedAt}, ${mailAccounts.createdAt}) < ${limit.toISOString()}::timestamptz`;
    const rows = await db
      .update(mailAccounts)
      .set({
        status: sql`case when ${overLimit} then 'reconnect' else 'error' end`,
        lastErrorCode: sql`case when ${overLimit} then 'login_refused' else 'session_refused' end`,
        lastErrorMessage: described.message,
        lastErrorAt: now,
      })
      .where(ownAccount(userId, accountId))
      .returning({ code: mailAccounts.lastErrorCode });
    return rows.at(0)?.code === "login_refused"
      ? "login_refused"
      : described.code;
  }
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
