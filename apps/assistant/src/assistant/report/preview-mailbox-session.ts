import { ToolRefusal } from "#src/assistant/agent/agent-tool.ts";
import type {
  FetchedMessage,
  MailboxSession,
  MailSearch,
} from "#src/assistant/mail/imap/types.ts";
import { parseMailSafely } from "#src/assistant/mail/parse/parse-mail.ts";

const SEEN = "\\Seen";
/** The bytes `list_mail` fetches: the id of a mail without a Message-ID comes from them. */
const HEADER_BYTES = 16 * 1024;
const FETCH_BATCH = 500;

function refuseWrite() {
  return Promise.reject(
    new ToolRefusal("A report preview changes nothing on the mail server."),
  );
}

/**
 * A session for a report preview. It shows the mail that a real report marked
 * read (`markedRead`, by Message-ID) as unread, as that report saw it, and
 * refuses every write to the server, so a bug in a preview cannot change mail.
 */
export function previewMailboxSession(
  session: MailboxSession,
  markedRead: ReadonlySet<string>,
): MailboxSession {
  const isMarked = async (message: FetchedMessage) =>
    message.flags.includes(SEEN) &&
    markedRead.has((await parseMailSafely(message)).messageId);

  let openPath = "";
  const markedUidsBySearch = new Map<string, number[]>();

  /** The marked mail of the open folder that the search finds. Paging repeats a search, so this does not fetch twice. */
  const markedUids = async (range: Omit<MailSearch, "seen">) => {
    const key = JSON.stringify([openPath, range]);
    const known = markedUidsBySearch.get(key);
    if (known) return known;
    const seen = await session.searchUids({ ...range, seen: true });
    const marked: number[] = [];
    for (let start = 0; start < seen.length; start += FETCH_BATCH) {
      const fetched = await session.fetchMessages(
        seen.slice(start, start + FETCH_BATCH),
        HEADER_BYTES,
      );
      for (const message of fetched) {
        if (await isMarked(message)) marked.push(message.uid);
      }
    }
    markedUidsBySearch.set(key, marked);
    return marked;
  };

  return {
    listFolders: () => session.listFolders(),
    createFolder: refuseWrite,
    renameFolder: refuseWrite,
    deleteEmptyFolder: refuseWrite,
    supportsMove: () => session.supportsMove(),
    openFolder: async (path, options) => {
      if (options?.write) return refuseWrite();
      const opened = await session.openFolder(path, options);
      openPath = path;
      return opened;
    },
    searchUids: async (criteria) => {
      const { seen, ...range } = criteria;
      const found = await session.searchUids(criteria);
      if (seen !== false || markedRead.size === 0) return found;
      const marked = await markedUids(range);
      return [...new Set([...found, ...marked])].sort((a, b) => a - b);
    },
    fetchMessages: async (uids, maxBytes) => {
      const fetched = await session.fetchMessages(uids, maxBytes);
      return Promise.all(
        fetched.map(async (message) =>
          (await isMarked(message))
            ? {
                ...message,
                flags: message.flags.filter((flag) => flag !== SEEN),
              }
            : message,
        ),
      );
    },
    addFlags: refuseWrite,
    removeFlags: refuseWrite,
    moveMessages: refuseWrite,
    isUsable: () => session.isUsable(),
    close: () => session.close(),
  };
}
