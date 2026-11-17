import { sql } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";
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
 * How long a server may refuse the stored password before the account asks
 * for a new connect: four or five runs of the organise cron. It is short,
 * because many bad logins can make a provider lock the account.
 */
export const PASSWORD_REFUSED_LIMIT_MS = 2 * 60 * 60 * 1000;

/**
 * When a refusal that can pass has lasted too long, and the time that
 * `last_error_at` keeps while it has not. Both read the row before the update.
 */
function refusalLimit(code: SyncErrorCode, now: Date) {
  const at = sql`${now.toISOString()}::timestamptz`;
  if (code === "session_refused") {
    const limit = new Date(now.getTime() - SESSION_REFUSED_LIMIT_MS);
    return {
      overLimit: sql`coalesce(${mailAccounts.lastSyncedAt}, ${mailAccounts.createdAt}) < ${limit.toISOString()}::timestamptz`,
      since: at,
    };
  }
  if (code === "password_refused") {
    const limit = new Date(now.getTime() - PASSWORD_REFUSED_LIMIT_MS);
    const since = sql`case when ${mailAccounts.lastErrorCode} = 'password_refused' then coalesce(${mailAccounts.lastErrorAt}, ${at}) else ${at} end`;
    return {
      overLimit: sql`(${mailAccounts.status} = 'reconnect' or ${since} <= ${limit.toISOString()}::timestamptz)`,
      since,
    };
  }
  return null;
}

/**
 * Records a failed login or run on the account; `reconnect` stops the crons
 * until the user connects again. A refusal can pass, so it keeps the account
 * in `error` and becomes `login_refused` only after its limit: a
 * `session_refused` account that has not opened for
 * `SESSION_REFUSED_LIMIT_MS`, or a `password_refused` one whose password the
 * server has refused, with no other result between, since
 * `PASSWORD_REFUSED_LIMIT_MS` ago. While a password is refused,
 * `last_error_at` keeps the first refusal. An account that waits for a new
 * connect stays so when its password is refused again. The connect flow
 * tries the typed password itself and shows a refusal at once.
 */
export async function recordAccountError(
  db: AssistantDb,
  userId: string,
  accountId: string,
  error: unknown,
  now: Date,
): Promise<SyncErrorCode> {
  const described = describeSyncError(error);
  const limit = refusalLimit(described.code, now);
  if (limit) {
    const { overLimit, since } = limit;
    const rows = await db
      .update(mailAccounts)
      .set({
        status: sql`case when ${overLimit} then 'reconnect' else 'error' end`,
        lastErrorCode: sql`case when ${overLimit} then 'login_refused' else ${described.code} end`,
        lastErrorMessage: described.message,
        lastErrorAt: sql`case when ${overLimit} then ${now.toISOString()}::timestamptz else ${since} end`,
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
  { db, userId }: UserScope,
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
