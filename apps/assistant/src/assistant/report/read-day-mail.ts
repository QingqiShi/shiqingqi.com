import { eq } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { recordAccountError } from "#src/assistant/mail/accounts/check-account.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import type { StoredAccount } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import type { MailboxSession } from "#src/assistant/mail/imap/types.ts";
import {
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import {
  dedupeByMessageId,
  isInDay,
  localDayBounds,
  mailSearchRange,
  type DayBounds,
} from "./local-day-bounds.ts";
import { reportFolders } from "./report-folders.ts";

/** The first bytes of each mail: the headers and enough of the text for the model. */
const FETCH_MAX_BYTES = 32 * 1024;
const BATCH_SIZE = 25;

/** One mail as the model reads it. It lives in memory only, for one report. */
export interface DayMail extends ParsedMail {
  accountId: string;
  accountAddress: string;
}

export interface DayMailResult {
  /** Each mail once, in the order the folders were read. */
  mails: DayMail[];
  /** The mails the time did not allow to fetch; some of them may be of another day. */
  notRead: number;
  /** True when the time ran out before every mailbox and folder was read. */
  ranOutOfTime: boolean;
  /** The mailboxes read without an error, also when the time ran out in one of them. */
  readMailboxes: number;
  unreadMailboxes: { accountId: string; address: string }[];
}

interface AccountRow extends StoredAccount {
  status: string;
}

async function readFolder(
  session: MailboxSession,
  path: string,
  context: {
    account: AccountRow;
    day: DayBounds;
    range: { since: Date; before: Date };
    now: () => Date;
    endsAt: number;
  },
) {
  await session.openFolder(path);
  const uids = await session.listUidsSince(
    context.range.since,
    context.range.before,
  );
  const mails: DayMail[] = [];
  for (let start = 0; start < uids.length; start += BATCH_SIZE) {
    if (context.now().getTime() >= context.endsAt) {
      return { mails, notRead: uids.length - start };
    }
    const fetched = await session.fetchMessages(
      uids.slice(start, start + BATCH_SIZE),
      FETCH_MAX_BYTES,
    );
    for (const message of fetched) {
      const parsed = await parseMailSafely(message);
      if (!isInDay(parsed.receivedAt, context.day)) continue;
      mails.push({
        ...parsed,
        accountId: context.account.id,
        accountAddress: context.account.address,
      });
    }
  }
  return { mails, notRead: 0 };
}

/**
 * Reads the mail that each of the user's mailboxes received on one local
 * day, read-only: folders open with EXAMINE and fetches use BODY.PEEK, so
 * no flag changes. A mailbox that cannot be read is recorded on its
 * account, and the other mailboxes are still read.
 * Nothing of the mail is stored.
 */
export async function readDayMail(
  {
    db,
    userId,
    localDate,
    timeZone,
    endsAt,
  }: {
    db: AssistantDb;
    userId: string;
    localDate: string;
    timeZone: string;
    /** No mailbox, folder or batch is opened after this. */
    endsAt: number;
  },
  deps: MailboxDeps,
): Promise<DayMailResult> {
  const accounts: AccountRow[] = await db
    .select({
      id: mailAccounts.id,
      provider: mailAccounts.provider,
      address: mailAccounts.address,
      credential: mailAccounts.credential,
      status: mailAccounts.status,
    })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId))
    .orderBy(mailAccounts.createdAt);
  const day = localDayBounds(localDate, timeZone);
  const range = mailSearchRange(localDate);
  const now = deps.auth.now;
  const outOfTime = () => now().getTime() >= endsAt;
  const result: DayMailResult = {
    mails: [],
    notRead: 0,
    ranOutOfTime: false,
    readMailboxes: 0,
    unreadMailboxes: [],
  };
  for (const account of accounts) {
    const unread = { accountId: account.id, address: account.address };
    if (account.status !== "ok") {
      result.unreadMailboxes.push(unread);
      continue;
    }
    if (outOfTime()) {
      result.ranOutOfTime = true;
      continue;
    }
    let session: MailboxSession | null = null;
    try {
      session = await openMailboxSession(db, userId, account, deps);
      const folders = reportFolders(
        account.provider,
        await session.listFolders(),
      );
      for (const path of folders) {
        if (outOfTime()) {
          result.ranOutOfTime = true;
          break;
        }
        const read = await readFolder(session, path, {
          account,
          day,
          range,
          now,
          endsAt,
        });
        result.mails.push(...read.mails);
        result.notRead += read.notRead;
        if (read.notRead > 0) result.ranOutOfTime = true;
      }
      result.readMailboxes += 1;
    } catch (error) {
      await recordAccountError(db, userId, account.id, error, now());
      result.unreadMailboxes.push(unread);
    } finally {
      await session?.close().catch(() => undefined);
    }
  }
  result.mails = dedupeByMessageId(result.mails);
  return result;
}
