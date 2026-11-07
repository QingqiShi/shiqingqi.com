import type {
  FetchedMessage,
  MailboxFolder,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import {
  isSyntheticMessageId,
  parseMailSafely,
} from "#src/assistant/mail/parse/parse-mail.ts";

const HEADER_BYTES = 16 * 1024;

/** Folders that show mail of other folders again: a mail found there is in a better folder too. */
const VIRTUAL = new Set(["\\All", "\\Flagged", "\\Important"]);

/**
 * The UID of the mail with `messageId` in the open folder: first at
 * `hintUids`, then by a search of the Message-ID header. A header search
 * matches part of the header too, so each candidate is read, and only the
 * same Message-ID counts. Null when the folder does not hold it.
 */
export async function uidWithMessageId(
  session: MailboxSession,
  messageId: string,
  hintUids: readonly number[] = [],
): Promise<number | null> {
  const candidates = [...hintUids];
  if (!isSyntheticMessageId(messageId)) {
    candidates.push(...(await session.searchUids({ messageId })));
  }
  for (const uid of new Set(candidates)) {
    const message = (await session.fetchMessages([uid], HEADER_BYTES)).at(0);
    if (!message) continue;
    if ((await parseMailSafely(message)).messageId === messageId) return uid;
  }
  return null;
}

function searchRank(folder: MailboxFolder, likely: string | null) {
  if (folder.path === likely) return 0;
  if (folder.path.toUpperCase() === "INBOX") return 1;
  if (folder.specialUse === null) return 2;
  if (!VIRTUAL.has(folder.specialUse)) return 3;
  return 4;
}

/**
 * Each folder opens read-only and the fetch uses BODY.PEEK, so the mail stays
 * unread. Null when no folder holds it.
 */
export async function findMailAnywhere(
  session: MailboxSession,
  messageId: string,
  { maxBytes, likely = null }: { maxBytes: number; likely?: string | null },
): Promise<{ folder: MailboxFolder; message: FetchedMessage } | null> {
  if (isSyntheticMessageId(messageId)) return null;
  const folders = (await session.listFolders())
    .filter((folder) => folder.selectable)
    .map((folder) => ({ folder, rank: searchRank(folder, likely) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ folder }) => folder);
  for (const folder of folders) {
    await session.openFolder(folder.path);
    const uid = await uidWithMessageId(session, messageId);
    if (uid === null) continue;
    const message = (await session.fetchMessages([uid], maxBytes)).at(0);
    if (message) return { folder, message };
  }
  return null;
}
