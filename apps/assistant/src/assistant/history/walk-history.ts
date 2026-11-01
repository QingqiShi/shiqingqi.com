import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { classifyByHeaders } from "#src/assistant/classify/classify-mail.ts";
import {
  mailAccounts,
  mailClassifications,
  mailFolders,
  mailHistoryJobs,
  mailMessages,
  mailSentRecipients,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import { resolveMailboxAuth } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import type { MailboxSession } from "#src/assistant/mail/imap/types.ts";
import {
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import type { FolderRow } from "#src/assistant/mail/sync/save-folders.ts";
import { storeIsolated } from "#src/assistant/mail/sync/store-isolated.ts";
import {
  FETCH_MAX_BYTES,
  type SyncDeps,
} from "#src/assistant/mail/sync/sync-account.ts";
import {
  compareHistoryOrder,
  historyModeOf,
  isInbox,
  type HistoryMode,
} from "./history-mode-of.ts";

/** How many UIDs one search of the walk covers. */
export const HISTORY_WINDOW = 500;
const BATCH_SIZE = 25;
/** Enough for the headers: indexed mail keeps no text. */
const INDEX_FETCH_BYTES = 8 * 1024;
/** Sent mail gives only its recipients, which are in the envelope. */
const RECIPIENTS_FETCH_BYTES = 1024;

export interface HistoryWalkResult {
  /** Mail stored as `history`. */
  stored: number;
  /** Of it, mail that waits for the model. */
  queued: number;
  /** False when the time ran out first; the next run goes on from the checkpoints. */
  complete: boolean;
}

interface WalkContext {
  db: AssistantDb;
  userId: string;
  accountId: string;
  session: MailboxSession;
  now: () => Date;
  endsAt: number;
  result: HistoryWalkResult;
}

type HistoryFolder = FolderRow & { mode: Exclude<HistoryMode, "skip"> };

function isOver(context: WalkContext) {
  return context.now().getTime() >= context.endsAt;
}

async function storeIndexed(
  { db, userId }: UserScope,
  context: WalkContext,
  folder: HistoryFolder,
  uidValidity: number,
  mails: ParsedMail[],
) {
  const rows = await db
    .insert(mailMessages)
    .values(
      mails.map((mail) => ({
        ...mail,
        snippet: "",
        userId,
        accountId: context.accountId,
        folderId: folder.id,
        uidValidity,
        origin: "history" as const,
      })),
    )
    .onConflictDoNothing({
      target: [mailMessages.userId, mailMessages.messageId],
    })
    .returning({ id: mailMessages.id });
  if (rows.length > 0) {
    await db
      .insert(mailClassifications)
      .values(
        rows.map((row) => ({
          userId,
          messageId: row.id,
          bucket: "filed" as const,
          categoryId: folder.categoryId,
          decidedBy: "folder" as const,
          reason: "folder",
          classifiedAt: context.now(),
        })),
      )
      .onConflictDoNothing({ target: mailClassifications.messageId });
  }
  return { stored: rows.length, queued: 0 };
}

/**
 * Stores the mail; a header rule classifies some at once, and the rest wait
 * for a batch. Only mail that waits keeps its text, for the model.
 */
async function storeForModel(
  { db, userId }: UserScope,
  context: WalkContext,
  folder: HistoryFolder,
  uidValidity: number,
  mails: ParsedMail[],
) {
  const byRule = new Map(
    mails.flatMap((mail) => {
      const classification = classifyByHeaders(mail);
      return classification ? [[mail.messageId, classification] as const] : [];
    }),
  );
  const rows = await db
    .insert(mailMessages)
    .values(
      mails.map((mail) => ({
        ...mail,
        snippet: byRule.has(mail.messageId) ? "" : mail.snippet,
        userId,
        accountId: context.accountId,
        folderId: folder.id,
        uidValidity,
        origin: "history" as const,
      })),
    )
    .onConflictDoNothing({
      target: [mailMessages.userId, mailMessages.messageId],
    })
    .returning({ id: mailMessages.id, messageId: mailMessages.messageId });
  const classified = rows.flatMap((row) => {
    const classification = byRule.get(row.messageId);
    return classification ? [{ id: row.id, classification }] : [];
  });
  const queued = rows.filter((row) => !byRule.has(row.messageId));
  if (classified.length > 0) {
    await db.insert(mailClassifications).values(
      classified.map(({ id, classification }) => ({
        ...classification,
        userId,
        messageId: id,
        classifiedAt: context.now(),
      })),
    );
  }
  if (queued.length > 0) {
    await db
      .insert(mailHistoryJobs)
      .values(queued.map((row) => ({ userId, messageId: row.id })));
  }
  return { stored: rows.length, queued: queued.length };
}

async function storeRecipients({ db, userId }: UserScope, mails: ParsedMail[]) {
  const latest = new Map<string, Date>();
  for (const mail of mails) {
    const sentAt = mail.sentAt ?? mail.receivedAt;
    for (const address of [...mail.toAddresses, ...mail.ccAddresses]) {
      const known = latest.get(address);
      if (!known || known < sentAt) latest.set(address, sentAt);
    }
  }
  if (latest.size > 0) {
    await db
      .insert(mailSentRecipients)
      .values(
        [...latest].map(([address, lastSentAt]) => ({
          userId,
          address,
          lastSentAt,
        })),
      )
      .onConflictDoUpdate({
        target: [mailSentRecipients.userId, mailSentRecipients.address],
        set: {
          lastSentAt: sql`greatest(${mailSentRecipients.lastSentAt}, excluded.last_sent_at)`,
        },
      });
  }
  return { stored: 0, queued: 0 };
}

function storeBatch(
  scope: UserScope,
  context: WalkContext,
  folder: HistoryFolder,
  uidValidity: number,
  mails: ParsedMail[],
) {
  if (mails.length === 0) return { stored: 0, queued: 0 };
  switch (folder.mode) {
    case "index":
      return storeIndexed(scope, context, folder, uidValidity, mails);
    case "classify":
      return storeForModel(scope, context, folder, uidValidity, mails);
    case "recipients":
      return storeRecipients(scope, mails);
  }
}

function fetchBytesOf(mode: HistoryFolder["mode"]) {
  switch (mode) {
    case "index":
      return INDEX_FETCH_BYTES;
    case "classify":
      return FETCH_MAX_BYTES;
    case "recipients":
      return RECIPIENTS_FETCH_BYTES;
  }
}

function setCheckpoint(
  { db }: UserScope,
  folderId: string,
  uidValidity: number,
  values: Partial<typeof mailFolders.$inferInsert>,
) {
  return db
    .update(mailFolders)
    .set(values)
    .where(
      and(
        eq(mailFolders.id, folderId),
        eq(mailFolders.historyUidValidity, uidValidity),
      ),
    );
}

/**
 * The UID the walk of a folder starts below, or null when it cannot start
 * yet. In the inbox, sync stores the mail above its baseline, so the walk
 * starts at the baseline; sync must have opened the folder with the same
 * UIDVALIDITY first. Elsewhere it starts at the newest mail.
 */
function startUidOf(
  folder: FolderRow,
  opened: { uidValidity: number; uidNext: number },
) {
  if (!isInbox(folder.path)) return Math.max(opened.uidNext - 1, 0);
  return folder.cursorUidValidity === opened.uidValidity
    ? folder.cursorBaselineUid
    : null;
}

/**
 * Walks one folder from its checkpoint down to UID 1, in windows of UIDs,
 * newest first. Each batch commits with the checkpoint, so a run that stops
 * at any point loses nothing and the next run goes on below it; a mail that
 * the database refuses is skipped. When
 * UIDVALIDITY changes, the walk starts again from the top: the stored mail
 * is found by its Message-ID and not stored twice.
 */
async function walkFolder(context: WalkContext, folder: HistoryFolder) {
  const { db, userId, session } = context;
  const opened = await session.openFolder(folder.path);
  let next = folder.historyNextUid;
  if (folder.historyUidValidity !== opened.uidValidity || next === null) {
    const start = startUidOf(folder, opened);
    if (start === null) return false;
    next = start;
    const startAt = start;
    await withUser(db, userId, ({ db }) =>
      db
        .update(mailFolders)
        .set({
          historyUidValidity: opened.uidValidity,
          historyNextUid: startAt,
          historyDoneAt: null,
        })
        .where(eq(mailFolders.id, folder.id)),
    );
  }
  const uidValidity = opened.uidValidity;
  while (next > 0) {
    const low = Math.max(1, next - HISTORY_WINDOW + 1);
    const uids = (await session.listUidsBetween(low, next)).reverse();
    for (let start = 0; start < uids.length; start += BATCH_SIZE) {
      if (isOver(context)) return false;
      const batch = uids.slice(start, start + BATCH_SIZE);
      const fetched = await session.fetchMessages(
        batch,
        fetchBytesOf(folder.mode),
      );
      const parsed = await Promise.all(fetched.map(parseMailSafely));
      const below = Math.min(...batch) - 1;
      const saved = await withUser(db, userId, async (scope) => {
        const counts = await storeIsolated(
          scope.db,
          parsed,
          async (db, mails) => [
            await storeBatch({ db, userId }, context, folder, uidValidity, [
              ...mails,
            ]),
          ],
          (_db, mail, error) => {
            console.error(
              "Old mail skipped",
              context.accountId,
              mail.uid,
              error instanceof Error ? error.message : error,
            );
            return Promise.resolve([]);
          },
        );
        await setCheckpoint(scope, folder.id, uidValidity, {
          historyNextUid: below,
        });
        return {
          stored: counts.reduce((sum, count) => sum + count.stored, 0),
          queued: counts.reduce((sum, count) => sum + count.queued, 0),
        };
      });
      context.result.stored += saved.stored;
      context.result.queued += saved.queued;
    }
    next = low - 1;
    const checkpoint = next;
    await withUser(db, userId, (scope) =>
      setCheckpoint(scope, folder.id, uidValidity, {
        historyNextUid: checkpoint,
        ...(checkpoint === 0 ? { historyDoneAt: context.now() } : {}),
      }),
    );
  }
  return true;
}

/** The folders of an account whose walk is not done, in the order to walk them. */
async function foldersToWalk({ db }: UserScope, accountId: string) {
  const folders = await db
    .select()
    .from(mailFolders)
    .where(
      and(
        eq(mailFolders.accountId, accountId),
        isNull(mailFolders.historyDoneAt),
      ),
    );
  return folders
    .map((folder) => ({ ...folder, mode: historyModeOf(folder) }))
    .filter((folder): folder is HistoryFolder => folder.mode !== "skip")
    .sort(compareHistoryOrder);
}

/**
 * Stores the mail that was in the user's mailboxes before each account
 * connected, account by account and folder by folder, until `endsAt`. It
 * reads only (`EXAMINE`, `BODY.PEEK`), stores mail as `history`, and leaves
 * sync errors to sync: an account that fails is tried again on the next run.
 */
export async function walkHistory(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: SyncDeps,
): Promise<HistoryWalkResult> {
  const now = deps.auth.now;
  const result: HistoryWalkResult = { stored: 0, queued: 0, complete: true };
  const accounts = await withUser(db, userId, ({ db }) =>
    db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
      })
      .from(mailAccounts)
      .where(ne(mailAccounts.status, "reconnect"))
      .orderBy(asc(mailAccounts.createdAt)),
  );
  for (const account of accounts) {
    const folders = await withUser(db, userId, (scope) =>
      foldersToWalk(scope, account.id),
    );
    if (folders.length === 0) continue;
    if (now().getTime() >= endsAt) {
      result.complete = false;
      break;
    }
    let session: MailboxSession | null = null;
    try {
      const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
      session = await deps.connector(MAIL_SERVERS[account.provider], auth);
      const context: WalkContext = {
        db,
        userId,
        accountId: account.id,
        session,
        now,
        endsAt,
        result,
      };
      for (const folder of folders) {
        if (!(await walkFolder(context, folder))) result.complete = false;
        if (isOver(context)) break;
      }
    } catch (error) {
      result.complete = false;
      console.error(
        "History import failed",
        account.id,
        error instanceof Error ? error.message : error,
      );
    } finally {
      await session?.close().catch(() => undefined);
    }
  }
  return result;
}
