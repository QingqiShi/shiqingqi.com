import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { MAX_CLASSIFY_ATTEMPTS } from "#src/assistant/classify/classify-queued-mail.ts";
import {
  mailAccounts,
  mailClassifications,
  mailDigests,
  mailFolders,
  mailMessages,
  mailWriteStates,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
import type { MailboxSession } from "#src/assistant/mail/imap/types.ts";
import { resolveMailboxAuth } from "../accounts/resolve-mailbox-auth.ts";
import { isSyntheticMessageId } from "../parse/parse-mail.ts";
import { describeSyncError } from "../sync/describe-sync-error.ts";
import type { SyncDeps } from "../sync/sync-account.ts";
import {
  FLAGGED,
  planMailboxWrites,
  SEEN,
  type WritePlan,
} from "./plan-mailbox-writes.ts";

/** After this many failed write commands, the app leaves a mail as it is. */
export const MAX_WRITE_FAILURES = 5;
/** How long the writes after the user closed digest items may run, after the response. */
export const CLOSED_ITEMS_WRITE_BUDGET_MS = 60_000;
/** Per account and run: mail with work to do, and mail that waits for the user, checked for whether it is still there. */
const WORK_LIMIT = 500;
const CHECK_LIMIT = 100;
const UID_BATCH = 100;

export const WRITE_ERROR_CODES = ["move_unsupported", "write_failed"] as const;
export type WriteErrorCode = (typeof WRITE_ERROR_CODES)[number];

export interface MailboxWriteResult {
  /** Mail that got at least one change, or was found where an earlier run moved it. */
  written: number;
  /** Mail that is no longer where the app left it. */
  lost: number;
  failed: number;
}

const currentFolder = alias(mailFolders, "current_folder");
const categoryFolder = alias(mailFolders, "category_folder");

const shownInDigest = sql<boolean>`exists (select 1 from ${mailDigests} where ${mailDigests.builtAt} >= ${mailClassifications.classifiedAt})`;
const needsUser = sql`(${mailClassifications.doneAt} is null and ${mailClassifications.bucket} in ('act', 'unsure'))`;
const leavesInbox = sql`(${mailClassifications.doneAt} is not null or ${mailClassifications.bucket} = 'filed' or (${mailClassifications.bucket} = 'fyi' and ${shownInDigest}))`;
/** `planMailboxWrites` gives at least one change. */
const hasWork = sql`(${mailWriteStates.seenAt} is null or (${needsUser} and ${mailWriteStates.flaggedAt} is null) or (not ${needsUser} and (${mailWriteStates.flaggedAt} is not null or ${leavesInbox})))`;

interface CandidateFilter {
  accountId: string;
  writesSince: Date | null;
  messageIds: readonly string[] | undefined;
}

function selectCandidates(
  db: AssistantDb,
  { accountId, writesSince, messageIds }: CandidateFilter,
  work: boolean,
) {
  return db
    .select({
      id: mailMessages.id,
      accountId: mailMessages.accountId,
      messageId: mailMessages.messageId,
      uid: mailMessages.uid,
      uidValidity: mailMessages.uidValidity,
      folderId: currentFolder.id,
      folderPath: currentFolder.path,
      bucket: mailClassifications.bucket,
      closed: sql<boolean>`${mailClassifications.doneAt} is not null`,
      shownInDigest,
      categoryFolderId: categoryFolder.id,
      categoryFolderPath: categoryFolder.path,
      seenAt: mailWriteStates.seenAt,
      flaggedAt: mailWriteStates.flaggedAt,
    })
    .from(mailMessages)
    .innerJoin(
      mailClassifications,
      eq(mailClassifications.messageId, mailMessages.id),
    )
    .innerJoin(currentFolder, eq(currentFolder.id, mailMessages.folderId))
    .leftJoin(
      categoryFolder,
      and(
        eq(categoryFolder.accountId, mailMessages.accountId),
        eq(categoryFolder.categoryId, mailClassifications.categoryId),
      ),
    )
    .leftJoin(mailWriteStates, eq(mailWriteStates.messageId, mailMessages.id))
    .where(
      and(
        eq(mailMessages.accountId, accountId),
        eq(mailMessages.origin, "live"),
        or(
          ne(mailClassifications.decidedBy, "failed"),
          gte(mailClassifications.attempts, MAX_CLASSIFY_ATTEMPTS),
        ),
        isNull(mailWriteStates.finishedAt),
        or(
          isNull(mailWriteStates.failures),
          lt(mailWriteStates.failures, MAX_WRITE_FAILURES),
        ),
        // Mail classified before the user allowed writes stays as it is,
        // unless the app wrote to it in an earlier period of writes.
        or(
          isNotNull(mailWriteStates.messageId),
          writesSince
            ? gte(mailClassifications.classifiedAt, writesSince)
            : sql`false`,
        ),
        work ? hasWork : sql`not ${hasWork}`,
        messageIds ? inArray(mailMessages.id, [...messageIds]) : undefined,
      ),
    )
    .orderBy(
      ...(work
        ? [asc(currentFolder.path), asc(mailMessages.uid)]
        : [asc(mailWriteStates.updatedAt)]),
    )
    .limit(work ? WORK_LIMIT : CHECK_LIMIT);
}

/**
 * Classified `live` mail of one account that the app may still have to
 * change. Mail that waits for another model call is not final yet, so it
 * waits here too. Only mail with work to do is read, so mail that waits for
 * the user never fills the page; a few of those, the ones checked longest
 * ago, come along to find the ones the user deleted.
 */
function readCandidates(
  db: AssistantDb,
  userId: string,
  filter: CandidateFilter,
) {
  return withUser(db, userId, async ({ db }) => [
    ...(await selectCandidates(db, filter, true)),
    ...(await selectCandidates(db, filter, false)),
  ]);
}

type Candidate = Awaited<ReturnType<typeof readCandidates>>[number];

type StateChange = Partial<
  Pick<
    typeof mailWriteStates.$inferInsert,
    "seenAt" | "flaggedAt" | "movedAt" | "finishedAt" | "lostAt"
  >
>;

interface RunContext {
  db: AssistantDb;
  userId: string;
  session: MailboxSession;
  now: () => Date;
  endsAt: number;
  result: MailboxWriteResult;
  errors: unknown[];
}

function saveState(context: RunContext, mailId: string, change: StateChange) {
  const now = context.now();
  return withUser(context.db, context.userId, ({ db, userId }) =>
    db
      .insert(mailWriteStates)
      .values({ messageId: mailId, userId, ...change, updatedAt: now })
      .onConflictDoUpdate({
        target: mailWriteStates.messageId,
        set: { ...change, updatedAt: now },
      }),
  );
}

async function saveFailure(
  context: RunContext,
  mails: readonly Candidate[],
  error: unknown,
) {
  context.errors.push(error);
  context.result.failed += mails.length;
  const lastError = describeSyncError(error).message;
  const now = context.now();
  await withUser(context.db, context.userId, async ({ db, userId }) => {
    for (const mail of mails) {
      await db
        .insert(mailWriteStates)
        .values({
          messageId: mail.id,
          userId,
          failures: 1,
          lastError,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: mailWriteStates.messageId,
          set: {
            failures: sql`${mailWriteStates.failures} + 1`,
            lastError,
            updatedAt: now,
          },
        });
    }
  });
}

/** Mail that waits for the user and is still where the app left it goes to the back of the checks. */
async function markChecked(context: RunContext, mailIds: readonly string[]) {
  if (mailIds.length === 0) return;
  await withUser(context.db, context.userId, ({ db }) =>
    db
      .update(mailWriteStates)
      .set({ updatedAt: context.now() })
      .where(inArray(mailWriteStates.messageId, [...mailIds])),
  );
}

function saveLocation(
  context: RunContext,
  mailId: string,
  location: { folderId: string; uid: number; uidValidity: number },
) {
  return withUser(context.db, context.userId, ({ db }) =>
    db.update(mailMessages).set(location).where(eq(mailMessages.id, mailId)),
  );
}

/** Runs one command on `uids` in batches; true when every batch worked. */
async function runBatched(
  uids: readonly number[],
  command: (batch: number[]) => Promise<unknown>,
) {
  for (let start = 0; start < uids.length; start += UID_BATCH) {
    await command(uids.slice(start, start + UID_BATCH));
  }
}

/** The single mail in the open folder with this Message-ID, or null. */
async function findByMessageId(session: MailboxSession, messageId: string) {
  if (isSyntheticMessageId(messageId)) return null;
  const found = await session.findUidsByMessageId(messageId);
  return found.length === 1 ? found[0] : null;
}

interface Located {
  mail: Candidate;
  uid: number;
  plan: WritePlan;
}

function planOf(mail: Candidate, inInbox: boolean) {
  return planMailboxWrites({
    bucket: mail.bucket,
    closed: mail.closed,
    shownInDigest: mail.shownInDigest,
    inInbox,
    categoryFolderPath: mail.categoryFolderPath,
    seen: mail.seenAt !== null,
    flagged: mail.flaggedAt !== null,
  });
}

/**
 * Finds each mail in the open folder: by its UID while UIDVALIDITY is the
 * same, else by its Message-ID. Mail the app moved but could not find yet
 * has UIDVALIDITY 0.
 */
async function locate(
  context: RunContext,
  mails: readonly Candidate[],
  folderId: string,
  uidValidity: number,
) {
  const known = mails.filter((mail) => mail.uidValidity === uidValidity);
  const present = new Set<number>();
  await runBatched(
    known.map((mail) => mail.uid),
    async (batch) => {
      for (const uid of await context.session.listPresentUids(batch)) {
        present.add(uid);
      }
    },
  );
  const found: { mail: Candidate; uid: number }[] = [];
  const missing: Candidate[] = [];
  for (const mail of mails) {
    if (mail.uidValidity === uidValidity && present.has(mail.uid)) {
      found.push({ mail, uid: mail.uid });
      continue;
    }
    const uid = await findByMessageId(context.session, mail.messageId);
    if (uid === null) {
      missing.push(mail);
      continue;
    }
    await saveLocation(context, mail.id, { folderId, uid, uidValidity });
    found.push({ mail, uid });
  }
  return { found, missing };
}

/** Sets or clears one flag on the located mail that need it; drops the mail whose command failed. */
async function storeFlag(
  context: RunContext,
  located: Located[],
  wants: (plan: WritePlan) => boolean,
  store: (uids: number[]) => Promise<void>,
): Promise<{ done: Set<Located>; remaining: Located[] }> {
  const chosen = located.filter((entry) => wants(entry.plan));
  try {
    await runBatched(
      chosen.map((entry) => entry.uid),
      store,
    );
    return { done: new Set(chosen), remaining: located };
  } catch (error) {
    await saveFailure(
      context,
      chosen.map((entry) => entry.mail),
      error,
    );
    const failed = new Set(chosen);
    return {
      done: new Set(),
      remaining: located.filter((entry) => !failed.has(entry)),
    };
  }
}

/**
 * Moves mail and records where it went. Without the new UIDs from the
 * server, the mail is searched for by Message-ID in the destination.
 */
async function moveLocated(
  context: RunContext,
  destination: string,
  destinationId: string,
  entries: readonly Located[],
) {
  const unknown: Candidate[] = [];
  for (let start = 0; start < entries.length; start += UID_BATCH) {
    const batch = entries.slice(start, start + UID_BATCH);
    try {
      const moved = await context.session.moveMessages(
        batch.map((entry) => entry.uid),
        destination,
      );
      for (const { mail, uid } of batch) {
        const newUid = moved?.uidMap.get(uid);
        await saveLocation(context, mail.id, {
          folderId: destinationId,
          uid: newUid ?? uid,
          uidValidity: moved && newUid !== undefined ? moved.uidValidity : 0,
        });
        await saveState(context, mail.id, {
          movedAt: context.now(),
          finishedAt: context.now(),
        });
        context.result.written += 1;
        if (newUid === undefined) unknown.push(mail);
      }
    } catch (error) {
      await saveFailure(
        context,
        batch.map((entry) => entry.mail),
        error,
      );
    }
  }
  return unknown;
}

/**
 * Looks in each mail's category folder for mail that left the folder it was
 * in: an earlier run may have moved it and stopped before it recorded the
 * move. Mail found there gets its location; mail not found was moved or
 * deleted by the user, and the app stops.
 */
async function findMoved(
  context: RunContext,
  mails: readonly { mail: Candidate; wasMovedNow: boolean }[],
) {
  const byFolder = Map.groupBy(mails, ({ mail }) => mail.categoryFolderPath);
  for (const [path, entries] of byFolder) {
    const opened =
      path === null ? null : await context.session.openFolder(path);
    for (const { mail, wasMovedNow } of entries) {
      const uid =
        opened === null
          ? null
          : await findByMessageId(context.session, mail.messageId);
      if (uid !== null && opened && mail.categoryFolderId) {
        await saveLocation(context, mail.id, {
          folderId: mail.categoryFolderId,
          uid,
          uidValidity: opened.uidValidity,
        });
        if (!wasMovedNow) {
          await saveState(context, mail.id, { movedAt: context.now() });
          context.result.written += 1;
        }
      } else if (!wasMovedNow) {
        await saveState(context, mail.id, {
          lostAt: context.now(),
          finishedAt: context.now(),
        });
        context.result.lost += 1;
      }
    }
  }
}

function isInbox(path: string) {
  return path.toUpperCase() === "INBOX";
}

async function writeFolder(context: RunContext, mails: readonly Candidate[]) {
  const { folderId, folderPath: path } = mails[0];
  const opened = await context.session.openFolder(path, { write: true });
  const { found, missing } = await locate(
    context,
    mails,
    folderId,
    opened.uidValidity,
  );
  const inInbox = isInbox(path);
  let located: Located[] = found.map(({ mail, uid }) => ({
    mail,
    uid,
    plan: planOf(mail, inInbox),
  }));

  const seen = await storeFlag(
    context,
    located,
    (plan) => plan.setSeen,
    (uids) => context.session.addFlags(uids, [SEEN]),
  );
  located = seen.remaining;
  const flagged = await storeFlag(
    context,
    located,
    (plan) => plan.setFlagged,
    (uids) => context.session.addFlags(uids, [FLAGGED]),
  );
  located = flagged.remaining;
  const unflagged = await storeFlag(
    context,
    located,
    (plan) => plan.clearFlagged,
    (uids) => context.session.removeFlags(uids, [FLAGGED]),
  );
  located = unflagged.remaining;

  const unchanged: string[] = [];
  for (const entry of located) {
    const change: StateChange = {};
    if (seen.done.has(entry)) change.seenAt = context.now();
    if (flagged.done.has(entry)) change.flaggedAt = context.now();
    if (unflagged.done.has(entry)) change.flaggedAt = null;
    const moving = entry.plan.moveTo !== null;
    if (entry.plan.final && !moving) change.finishedAt = context.now();
    if (Object.keys(change).length === 0) {
      unchanged.push(entry.mail.id);
      continue;
    }
    await saveState(context, entry.mail.id, change);
    if (!moving) context.result.written += 1;
  }

  await markChecked(context, unchanged);

  const moves = Map.groupBy(
    located.filter((entry) => entry.plan.moveTo !== null),
    (entry) => entry.mail.categoryFolderId ?? "",
  );
  const unknown: Candidate[] = [];
  for (const [destinationId, entries] of moves) {
    const destination = entries[0].plan.moveTo;
    if (!destination || !destinationId) continue;
    unknown.push(
      ...(await moveLocated(context, destination, destinationId, entries)),
    );
  }

  const leftForMove = missing.filter(
    (mail) => planOf(mail, inInbox).moveTo !== null,
  );
  const lost = missing.filter((mail) => !leftForMove.includes(mail));
  for (const mail of lost) {
    await saveState(context, mail.id, {
      lostAt: context.now(),
      finishedAt: context.now(),
    });
    context.result.lost += 1;
  }
  await findMoved(context, [
    ...leftForMove.map((mail) => ({ mail, wasMovedNow: false })),
    ...unknown.map((mail) => ({ mail, wasMovedNow: true })),
  ]);
}

function writeErrorOf(errors: readonly unknown[]) {
  const error = errors.find((found) => found instanceof MoveUnsupportedError);
  const shown = error ?? errors.at(-1);
  return {
    writeErrorCode: error ? "move_unsupported" : "write_failed",
    writeErrorMessage: describeSyncError(shown).message,
  };
}

/**
 * Applies `planMailboxWrites` to the user's classified mail when the user
 * allowed mailbox writes: account by account, folder by folder, with one
 * command for many UIDs. It never deletes, never reads a body, and touches
 * only mail it finds by the UID or Message-ID that sync stored. A run can
 * stop at any point: the next one finds each mail again and does only what
 * `mail_write_states` says is left. Failures show on the account.
 */
export async function writeMailboxes(
  {
    db,
    userId,
    endsAt,
    messageIds,
  }: {
    db: AssistantDb;
    userId: string;
    endsAt: number;
    /** Only these `mail_messages` ids, such as the items the user just closed. */
    messageIds?: readonly string[];
  },
  deps: SyncDeps,
): Promise<MailboxWriteResult> {
  const now = deps.auth.now;
  const result: MailboxWriteResult = { written: 0, lost: 0, failed: 0 };
  if (messageIds?.length === 0) return result;
  const { settings, accounts } = await withUser(db, userId, async ({ db }) => ({
    settings: (
      await db
        .select({
          on: userSettings.mailboxWrites,
          since: userSettings.mailboxWritesSince,
        })
        .from(userSettings)
    ).at(0),
    accounts: await db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
      })
      .from(mailAccounts)
      .where(ne(mailAccounts.status, "reconnect"))
      .orderBy(asc(mailAccounts.createdAt)),
  }));
  if (!settings?.on) return result;
  for (const [index, account] of accounts.entries()) {
    const current = now().getTime();
    if (current >= endsAt) break;
    // Each account gets an equal share of the time left, so a large backlog in one cannot stop the others.
    const accountEndsAt =
      current + (endsAt - current) / (accounts.length - index);
    const candidates = await readCandidates(db, userId, {
      accountId: account.id,
      writesSince: settings.since,
      messageIds,
    });
    if (candidates.length === 0) continue;
    const errors: unknown[] = [];
    let session: MailboxSession | null = null;
    let complete = true;
    try {
      const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
      session = await deps.connector(MAIL_SERVERS[account.provider], auth);
      const context: RunContext = {
        db,
        userId,
        session,
        now,
        endsAt: accountEndsAt,
        result,
        errors,
      };
      const byFolder = Map.groupBy(candidates, (mail) => mail.folderId);
      for (const mails of byFolder.values()) {
        if (now().getTime() >= accountEndsAt) {
          complete = false;
          break;
        }
        await writeFolder(context, mails);
      }
    } catch (error) {
      errors.push(error);
    } finally {
      await session?.close().catch(() => undefined);
    }
    if (errors.length === 0 && !complete) continue;
    await withUser(db, userId, ({ db }) =>
      db
        .update(mailAccounts)
        .set(
          errors.length > 0
            ? { ...writeErrorOf(errors), writeErrorAt: now() }
            : {
                writeErrorCode: null,
                writeErrorMessage: null,
                writeErrorAt: null,
              },
        )
        .where(eq(mailAccounts.id, account.id)),
    );
  }
  return result;
}
