import PostalMime from "postal-mime";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
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

/** A command that changed the mailbox. */
export type FakeMailWrite =
  | { command: "add" | "remove"; path: string; uids: number[]; flags: string[] }
  | { command: "move"; path: string; uids: number[]; destination: string };

/** What a fake mail server saw, for tests that check what the app did to the mailbox. */
export interface FakeMailServerLog {
  logins: number;
  /** Each folder a session opened, and whether it opened it for writes. */
  opened: { path: string; write: boolean }[];
  fetchedUids: number[];
  writes: FakeMailWrite[];
  createdFolders: string[];
}

const MESSAGE_ID_HEADER = /^message-id:[ \t]*(.*)$/im;

/**
 * An in-memory IMAP server for one mailbox. `connector` logs in with
 * `password` or `accessToken`, and fails with `failNextConnects` when it is
 * set. `uidPlus: false` makes MOVE say no new UIDs; `move: false` makes a
 * server without MOVE. `refusal` is the error message of a refused login.
 */
export function createFakeMailServer({
  user,
  password,
  accessToken,
  uidPlus = true,
  move = true,
  refusal,
}: {
  user: string;
  password?: string;
  accessToken?: string;
  uidPlus?: boolean;
  move?: boolean;
  refusal?: string;
}) {
  const folders = new Map<string, FakeFolder>();
  const log: FakeMailServerLog = {
    logins: 0,
    opened: [],
    fetchedUids: [],
    writes: [],
    createdFolders: [],
  };
  let failingCommand: FakeMailWrite["command"] | "create" | null = null;
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

  function append(folder: FakeFolder, message: Omit<FakeMessage, "uid">) {
    const uid = folder.uidNext;
    folder.uidNext += 1;
    folder.messages.push({ ...message, uid });
    return uid;
  }

  function moveOut(from: FakeFolder, uids: readonly number[], to: FakeFolder) {
    const wanted = new Set(uids);
    const uidMap = new Map<number, number>();
    for (const message of from.messages.filter((m) => wanted.has(m.uid))) {
      uidMap.set(message.uid, append(to, message));
    }
    from.messages = from.messages.filter((m) => !wanted.has(m.uid));
    return uidMap;
  }

  function messageIdOf(message: FakeMessage) {
    return MESSAGE_ID_HEADER.exec(message.raw)?.[1]?.trim() ?? "";
  }

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
    if (!accepted) return Promise.reject(new MailboxAuthError(refusal));
    log.logins += 1;
    let open: FakeFolder | null = null;
    let writable = false;
    const openFolder = () => {
      if (!open) throw new Error("No folder is open");
      return open;
    };
    const writableFolder = (write: FakeMailWrite) => {
      const folder = openFolder();
      if (!writable) throw new Error("The folder is open read-only");
      if (failingCommand === write.command) {
        throw new Error(`The server refused ${write.command}`);
      }
      log.writes.push(write);
      return folder;
    };
    const session: MailboxSession = {
      listFolders: (options) => {
        const counts = options?.counts !== false;
        return Promise.resolve(
          [...folders.values()].map((folder) => ({
            path: folder.path,
            name: folder.path.split("/").at(-1) ?? folder.path,
            delimiter: "/",
            specialUse: folder.specialUse,
            selectable: folder.selectable,
            messages:
              counts && folder.selectable ? folder.messages.length : null,
            unseen:
              counts && folder.selectable
                ? folder.messages.filter((m) => !m.flags.has("\\Seen")).length
                : null,
          })),
        );
      },
      createFolder: (path) => {
        if (failingCommand === "create") {
          return Promise.reject(new Error("The server refused create"));
        }
        log.createdFolders.push(path);
        if (!folders.has(path)) addFolder(path);
        return Promise.resolve();
      },
      supportsMove: () => move,
      openFolder: (path, options) => {
        open = folderOf(path);
        writable = options?.write === true;
        log.opened.push({ path, write: writable });
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
      listUidsBetween: (low, high) =>
        Promise.resolve(
          openFolder()
            .messages.map((m) => m.uid)
            .filter((uid) => uid >= low && uid <= high),
        ),
      listUidsSince: (since, before) =>
        Promise.resolve(
          openFolder()
            .messages.filter(
              (m) =>
                m.internalDate >= since &&
                (before === undefined || m.internalDate < before),
            )
            .map((m) => m.uid),
        ),
      fetchMessages: async (uids, maxBytes) => {
        const wanted = new Set(uids);
        const found = openFolder().messages.filter((m) => wanted.has(m.uid));
        log.fetchedUids.push(...found.map((m) => m.uid));
        return Promise.all(found.map((m) => toFetched(m, maxBytes)));
      },
      listPresentUids: (uids) => {
        const wanted = new Set(uids);
        return Promise.resolve(
          openFolder()
            .messages.map((m) => m.uid)
            .filter((uid) => wanted.has(uid)),
        );
      },
      findUidsByMessageId: (messageId) =>
        Promise.resolve(
          openFolder()
            .messages.filter((m) => messageIdOf(m).includes(messageId))
            .map((m) => m.uid),
        ),
      addFlags: (uids, flags) => {
        const folder = writableFolder({
          command: "add",
          path: openFolder().path,
          uids,
          flags,
        });
        for (const message of folder.messages) {
          if (!uids.includes(message.uid)) continue;
          for (const flag of flags) message.flags.add(flag);
        }
        return Promise.resolve();
      },
      removeFlags: (uids, flags) => {
        const folder = writableFolder({
          command: "remove",
          path: openFolder().path,
          uids,
          flags,
        });
        for (const message of folder.messages) {
          if (!uids.includes(message.uid)) continue;
          for (const flag of flags) message.flags.delete(flag);
        }
        return Promise.resolve();
      },
      moveMessages: (uids, destination) => {
        if (!move) return Promise.reject(new MoveUnsupportedError());
        const from = writableFolder({
          command: "move",
          path: openFolder().path,
          uids,
          destination,
        });
        const to = folderOf(destination);
        const uidMap = moveOut(from, uids, to);
        return Promise.resolve(
          uidPlus ? { uidValidity: to.uidValidity, uidMap } : null,
        );
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
      return append(folderOf(path), {
        raw,
        flags: new Set(options.flags ?? []),
        internalDate: options.internalDate ?? new Date(),
      });
    },
    /** Moves a mail as the user does in a mail client; returns its new UID. */
    moveAsUser(path: string, uid: number, destination: string) {
      return moveOut(folderOf(path), [uid], folderOf(destination)).get(uid);
    },
    /** The folder, UID and flags of each copy of a mail. */
    locate(messageId: string) {
      return [...folders.values()].flatMap((folder) =>
        folder.messages
          .filter((m) => messageIdOf(m) === messageId)
          .map((m) => ({
            path: folder.path,
            uid: m.uid,
            flags: [...m.flags].sort(),
          })),
      );
    },
    /** Makes every later write command of this kind fail; null stops it. */
    failCommand(command: FakeMailWrite["command"] | "create" | null) {
      failingCommand = command;
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
