import { and, eq, sql } from "drizzle-orm";
import {
  mailAccounts,
  mailFolders,
  mailMessages,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserDb } from "#src/assistant/db/with-user.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import type {
  FetchedMessage,
  MailboxConnector,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import {
  saveFolders,
  type FolderRow,
} from "#src/assistant/mail/sync/save-folders.ts";
import {
  resolveMailboxAuth,
  type MailboxAuthDeps,
  type StoredAccount,
} from "../accounts/resolve-mailbox-auth.ts";
import {
  hashedMessageId,
  parseMail,
  type ParsedMail,
} from "../parse/parse-mail.ts";
import {
  describeSyncError,
  type SyncErrorCode,
} from "./describe-sync-error.ts";
import { storeIsolated } from "./store-isolated.ts";

/** The first bytes of each mail that sync fetches: the headers and the start of the text. */
export const FETCH_MAX_BYTES = 16 * 1024;
const BATCH_SIZE = 25;
/** After a UIDVALIDITY change, mail this long before the last sync is fetched again. */
const RESCAN_OVERLAP_MS = 24 * 60 * 60 * 1000;

export interface SyncDeps {
  connector: MailboxConnector;
  auth: MailboxAuthDeps;
}

export type SyncAccountResult =
  | {
      ok: true;
      /** The `live` mail this run stored, for the classifier. */
      newMessageIds: string[];
      /** False when the time ran out first; the next run goes on from the cursor. */
      complete: boolean;
    }
  | { ok: false; code: SyncErrorCode };

interface FolderContext {
  db: AssistantDb;
  userId: string;
  accountId: string;
  session: MailboxSession;
  now: () => Date;
  endsAt: number;
}

type LiveRow = typeof mailMessages.$inferInsert;

function insertLive(db: UserDb, rows: readonly LiveRow[]) {
  return db
    .insert(mailMessages)
    .values([...rows])
    .onConflictDoNothing({
      target: [mailMessages.userId, mailMessages.messageId],
    })
    .returning({ id: mailMessages.id });
}

/** What is kept of a mail that does not store: where it is and when it came, so that the user still sees it. */
function bareMail(row: LiveRow): LiveRow {
  return {
    userId: row.userId,
    accountId: row.accountId,
    folderId: row.folderId,
    uidValidity: row.uidValidity,
    uid: row.uid,
    messageId: hashedMessageId(row.messageId),
    receivedAt: row.receivedAt,
    origin: row.origin,
  };
}

async function parseSafely(message: FetchedMessage): Promise<ParsedMail> {
  try {
    return await parseMail(message);
  } catch {
    // A source that does not parse must not stop the cursor: keep the envelope.
    return parseMail({ ...message, source: new Uint8Array() });
  }
}

/**
 * Fetches `uids` in batches and stores each mail once per user. Each batch
 * commits with the cursor, so a run that stops at any point loses nothing
 * and the next run fetches only what is left. A mail that the database
 * refuses keeps only its place and date, so it never stops the cursor.
 */
async function fetchAndStore(
  context: FolderContext,
  folder: FolderRow,
  uidValidity: number,
  uids: readonly number[],
  advanceCursor: boolean,
) {
  const newMessageIds: string[] = [];
  for (let start = 0; start < uids.length; start += BATCH_SIZE) {
    if (context.now().getTime() >= context.endsAt) {
      return { newMessageIds, complete: false };
    }
    const batch = uids.slice(start, start + BATCH_SIZE);
    const fetched = await context.session.fetchMessages(batch, FETCH_MAX_BYTES);
    const parsed = await Promise.all(fetched.map(parseSafely));
    const inserted = await withUser(
      context.db,
      context.userId,
      async ({ db }) => {
        const rows = await storeIsolated(
          db,
          parsed.map((mail) => ({
            ...mail,
            userId: context.userId,
            accountId: context.accountId,
            folderId: folder.id,
            uidValidity,
            origin: "live" as const,
          })),
          insertLive,
          (db, row, error) => {
            console.error(
              "Mail kept only in part",
              context.accountId,
              row.uid,
              error instanceof Error ? error.message : error,
            );
            return insertLive(db, [bareMail(row)]);
          },
        );
        if (advanceCursor) {
          await db
            .update(mailFolders)
            .set({
              cursorLastUid: sql`greatest(${mailFolders.cursorLastUid}, ${Math.max(...batch)})`,
              syncedAt: context.now(),
            })
            .where(
              and(
                eq(mailFolders.id, folder.id),
                eq(mailFolders.cursorUidValidity, uidValidity),
              ),
            );
        }
        return rows;
      },
    );
    newMessageIds.push(...inserted.map((row) => row.id));
  }
  return { newMessageIds, complete: true };
}

async function setCursor(
  context: FolderContext,
  folderId: string,
  cursor: { uidValidity: number; lastUid: number; baselineUid: number },
) {
  await withUser(context.db, context.userId, ({ db }) =>
    db
      .update(mailFolders)
      .set({
        cursorUidValidity: cursor.uidValidity,
        cursorLastUid: cursor.lastUid,
        cursorBaselineUid: cursor.baselineUid,
        syncedAt: context.now(),
      })
      .where(eq(mailFolders.id, folderId)),
  );
}

/**
 * Fetches the mail that arrived in a folder since its cursor.
 *
 * - The first sync stores no mail: it puts the cursor at the newest UID, and
 *   all mail up to it is history.
 * - When UIDVALIDITY changed, every UID is new, so the cursor is useless:
 *   sync fetches the mail received since shortly before the last sync, skips
 *   the Message-IDs it has, and only then moves the cursor to the new UIDs.
 */
async function syncFolder(context: FolderContext, folder: FolderRow) {
  const opened = await context.session.openFolder(folder.path);
  const highest = Math.max(opened.uidNext - 1, 0);
  if (folder.cursorUidValidity === null || folder.cursorLastUid === null) {
    await setCursor(context, folder.id, {
      uidValidity: opened.uidValidity,
      lastUid: highest,
      baselineUid: highest,
    });
    return { newMessageIds: [], complete: true };
  }
  if (folder.cursorUidValidity !== opened.uidValidity) {
    const since = new Date(
      (folder.syncedAt ?? context.now()).getTime() - RESCAN_OVERLAP_MS,
    );
    const uids = await context.session.listUidsSince(since);
    const result = await fetchAndStore(
      context,
      folder,
      opened.uidValidity,
      uids,
      false,
    );
    if (result.complete) {
      await setCursor(context, folder.id, {
        uidValidity: opened.uidValidity,
        lastUid: uids.reduce((max, uid) => Math.max(max, uid), highest),
        baselineUid: highest,
      });
    }
    return result;
  }
  const uids = await context.session.listUidsAfter(folder.cursorLastUid);
  const result = await fetchAndStore(
    context,
    folder,
    opened.uidValidity,
    uids,
    true,
  );
  if (uids.length === 0) {
    await withUser(context.db, context.userId, ({ db }) =>
      db
        .update(mailFolders)
        .set({ syncedAt: context.now() })
        .where(eq(mailFolders.id, folder.id)),
    );
  }
  return result;
}

/**
 * Syncs one account: the folder list and counts, then the new mail of the
 * inbox. Records the outcome on the account. It runs outside a transaction
 * and opens one per write, so it can wait on the mail server; any run can
 * stop at any point and run again.
 */
export async function syncAccount(
  {
    db,
    userId,
    account,
    endsAt,
  }: {
    db: AssistantDb;
    userId: string;
    account: StoredAccount;
    endsAt: number;
  },
  deps: SyncDeps,
): Promise<SyncAccountResult> {
  const now = deps.auth.now;
  let session: MailboxSession | null = null;
  try {
    const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
    session = await deps.connector(MAIL_SERVERS[account.provider], auth);
    const listed = await session.listFolders();
    const folders = await withUser(db, userId, (scope) =>
      saveFolders(scope, account.id, listed, now()),
    );
    const inbox = folders.find(
      (folder) => folder.path.toUpperCase() === "INBOX",
    );
    const result = inbox
      ? await syncFolder(
          { db, userId, accountId: account.id, session, now, endsAt },
          inbox,
        )
      : { newMessageIds: [], complete: true };
    await withUser(db, userId, ({ db }) =>
      db
        .update(mailAccounts)
        .set({
          status: "ok",
          lastSyncedAt: now(),
          lastErrorCode: null,
          lastErrorMessage: null,
          lastErrorAt: null,
        })
        .where(eq(mailAccounts.id, account.id)),
    );
    return { ok: true, ...result };
  } catch (error) {
    const described = describeSyncError(error);
    await withUser(db, userId, ({ db }) =>
      db
        .update(mailAccounts)
        .set({
          status: described.status,
          lastErrorCode: described.code,
          lastErrorMessage: described.message,
          lastErrorAt: now(),
        })
        .where(eq(mailAccounts.id, account.id)),
    );
    return { ok: false, code: described.code };
  } finally {
    await session?.close().catch(() => undefined);
  }
}
