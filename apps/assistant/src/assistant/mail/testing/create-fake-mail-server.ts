import PostalMime from "postal-mime";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type {
  FetchedMessage,
  MailboxAuth,
  MailboxConnector,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import { mailAddressesOf } from "#src/assistant/mail/parse/mail-addresses-of.ts";

interface FakeMessage {
  uid: number;
  raw: string;
  flags: Set<string>;
  internalDate: Date;
}

interface FakeFolder {
  path: string;
  specialUse: string | null;
  selectable: boolean;
  uidValidity: number;
  uidNext: number;
  messages: FakeMessage[];
}

/** What a fake mail server saw, for tests that check what sync did to the mailbox. */
export interface FakeMailServerLog {
  logins: number;
  fetchedUids: number[];
}

/**
 * An in-memory IMAP server for one mailbox. `connector` logs in with
 * `password` or `accessToken`, and fails with `failWith` when it is set.
 */
export function createFakeMailServer({
  user,
  password,
  accessToken,
}: {
  user: string;
  password?: string;
  accessToken?: string;
}) {
  const folders = new Map<string, FakeFolder>();
  const log: FakeMailServerLog = { logins: 0, fetchedUids: [] };
  let failure: Error | null = null;
  let validToken = accessToken;

  function addFolder(
    path: string,
    options: {
      specialUse?: string;
      selectable?: boolean;
      uidValidity?: number;
    } = {},
  ) {
    folders.set(path, {
      path,
      specialUse: options.specialUse ?? null,
      selectable: options.selectable ?? true,
      uidValidity: options.uidValidity ?? 1,
      uidNext: 1,
      messages: [],
    });
  }

  function folderOf(path: string) {
    const folder = folders.get(path);
    if (!folder) throw new Error(`No folder ${path}`);
    return folder;
  }

  addFolder("INBOX");

  async function toFetched(
    message: FakeMessage,
    maxBytes: number,
  ): Promise<FetchedMessage> {
    const bytes = new TextEncoder().encode(message.raw);
    const parsed = await PostalMime.parse(message.raw);
    return {
      uid: message.uid,
      flags: [...message.flags],
      internalDate: message.internalDate,
      size: bytes.length,
      envelope: {
        date: parsed.date ? new Date(parsed.date) : null,
        subject: parsed.subject ?? null,
        messageId: parsed.messageId ?? null,
        inReplyTo: parsed.inReplyTo ?? null,
        from: mailAddressesOf(parsed.from ? [parsed.from] : []),
        replyTo: mailAddressesOf(parsed.replyTo),
        to: mailAddressesOf(parsed.to),
        cc: mailAddressesOf(parsed.cc),
      },
      source: bytes.slice(0, maxBytes),
    };
  }

  const connector: MailboxConnector = (_server, auth: MailboxAuth) => {
    if (failure) return Promise.reject(failure);
    const accepted =
      auth.user === user &&
      ("pass" in auth
        ? password !== undefined && auth.pass === password
        : validToken !== undefined && auth.accessToken === validToken);
    if (!accepted) return Promise.reject(new MailboxAuthError());
    log.logins += 1;
    let open: FakeFolder | null = null;
    const openFolder = () => {
      if (!open) throw new Error("No folder is open");
      return open;
    };
    const session: MailboxSession = {
      listFolders: () =>
        Promise.resolve(
          [...folders.values()].map((folder) => ({
            path: folder.path,
            name: folder.path.split("/").at(-1) ?? folder.path,
            delimiter: "/",
            specialUse: folder.specialUse,
            selectable: folder.selectable,
            messages: folder.selectable ? folder.messages.length : null,
            unseen: folder.selectable
              ? folder.messages.filter((m) => !m.flags.has("\\Seen")).length
              : null,
          })),
        ),
      openFolder: (path) => {
        open = folderOf(path);
        return Promise.resolve({
          uidValidity: open.uidValidity,
          uidNext: open.uidNext,
        });
      },
      listUidsAfter: (uid) =>
        Promise.resolve(
          openFolder()
            .messages.map((m) => m.uid)
            .filter((found) => found > uid),
        ),
      listUidsSince: (since) =>
        Promise.resolve(
          openFolder()
            .messages.filter((m) => m.internalDate >= since)
            .map((m) => m.uid),
        ),
      fetchMessages: async (uids, maxBytes) => {
        const wanted = new Set(uids);
        const found = openFolder().messages.filter((m) => wanted.has(m.uid));
        log.fetchedUids.push(...found.map((m) => m.uid));
        return Promise.all(found.map((m) => toFetched(m, maxBytes)));
      },
      close: () => Promise.resolve(),
    };
    return Promise.resolve(session);
  };

  return {
    connector,
    log,
    addFolder,
    /** Puts a raw RFC 5322 message into a folder and returns its UID. */
    deliver(
      path: string,
      raw: string,
      options: { flags?: string[]; internalDate?: Date } = {},
    ) {
      const folder = folderOf(path);
      const uid = folder.uidNext;
      folder.uidNext += 1;
      folder.messages.push({
        uid,
        raw,
        flags: new Set(options.flags ?? []),
        internalDate: options.internalDate ?? new Date(),
      });
      return uid;
    },
    /** Gives every message new UIDs under a new UIDVALIDITY, as a rebuilt server does. */
    renumber(path: string) {
      const folder = folderOf(path);
      folder.uidValidity += 1;
      folder.uidNext = 1;
      for (const message of folder.messages) {
        message.uid = folder.uidNext;
        folder.uidNext += 1;
      }
    },
    flagsOf(path: string, uid: number) {
      return [
        ...(folderOf(path).messages.find((m) => m.uid === uid)?.flags ?? []),
      ];
    },
    failNextConnects(error: Error | null) {
      failure = error;
    },
    acceptToken(token: string) {
      validToken = token;
    },
  };
}

export type FakeMailServer = ReturnType<typeof createFakeMailServer>;

/** A raw mail for the fake server. */
export function rawMail({
  messageId,
  from = "Sender <sender@example.com>",
  to = "me@icloud.com",
  subject = "Hello",
  date = "Sun, 01 Nov 2026 09:00:00 +0000",
  body = "Hi there.",
  headers = {},
}: {
  messageId?: string | null;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  body?: string;
  headers?: Record<string, string>;
}): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    ...(messageId ? [`Message-ID: ${messageId}`] : []),
    ...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ];
  return lines.join("\r\n");
}
