export interface MailServer {
  host: string;
  port: number;
}

/** A password login, or an OAuth access token for XOAUTH2. */
export type MailboxAuth =
  { user: string; pass: string } | { user: string; accessToken: string };

export interface MailboxFolder {
  path: string;
  name: string;
  delimiter: string | null;
  /** Such as `\Sent` or `\Trash`; null for a folder the user made. */
  specialUse: string | null;
  /** False for a folder that only holds other folders. */
  selectable: boolean;
  messages: number | null;
  unseen: number | null;
}

export interface OpenedFolder {
  uidValidity: number;
  uidNext: number;
}

export interface MailAddress {
  name: string | null;
  address: string | null;
}

export interface FetchedMessage {
  uid: number;
  flags: string[];
  internalDate: Date | null;
  size: number | null;
  envelope: {
    date: Date | null;
    subject: string | null;
    messageId: string | null;
    inReplyTo: string | null;
    from: MailAddress[];
    replyTo: MailAddress[];
    to: MailAddress[];
    cc: MailAddress[];
  };
  /** The start of the raw message, headers first; at most the bytes asked for. */
  source: Uint8Array;
}

/** Where a MOVE put the mail, when the server says it (UIDPLUS COPYUID). */
export interface MovedMessages {
  uidValidity: number;
  /** Source UID to destination UID. */
  uidMap: Map<number, number>;
}

/**
 * One logged-in IMAP connection. A fetch always uses BODY.PEEK, so reading
 * never marks mail read. A folder opens read-only unless `write` is set.
 */
export interface MailboxSession {
  /**
   * Every folder. With `counts`, the default, it also asks the server for the
   * message and unseen counts of each selectable folder, one STATUS each;
   * without them the counts are null.
   */
  listFolders(options?: { counts?: boolean }): Promise<MailboxFolder[]>;
  /** Makes a folder and subscribes to it; a folder that is already there is kept as it is. */
  createFolder(path: string): Promise<void>;
  /** Whether the server has the MOVE command, which `moveMessages` needs. */
  supportsMove(): boolean;
  openFolder(
    path: string,
    options?: { write?: boolean },
  ): Promise<OpenedFolder>;
  /** The UIDs above `uid` in the open folder, in ascending order. */
  listUidsAfter(uid: number): Promise<number[]>;
  /** The UIDs from `low` to `high`, both included, in the open folder, ascending. */
  listUidsBetween(low: number, high: number): Promise<number[]>;
  /**
   * The UIDs of mail the open folder received on or after the date of
   * `since`, and before the date of `before` when it is set, ascending.
   * IMAP compares dates only, in the server's time zone.
   */
  listUidsSince(since: Date, before?: Date): Promise<number[]>;
  fetchMessages(uids: number[], maxBytes: number): Promise<FetchedMessage[]>;
  /** Of `uids`, the ones that the open folder still holds, ascending. */
  listPresentUids(uids: number[]): Promise<number[]>;
  /** The UIDs of mail in the open folder whose Message-ID header holds `messageId`. */
  findUidsByMessageId(messageId: string): Promise<number[]>;
  addFlags(uids: number[], flags: string[]): Promise<void>;
  removeFlags(uids: number[], flags: string[]): Promise<void>;
  /**
   * Moves mail of the open folder with the MOVE command. It never copies and
   * deletes: without MOVE it throws `MoveUnsupportedError`. Null when the
   * server does not say the new UIDs.
   */
  moveMessages(
    uids: number[],
    destination: string,
  ): Promise<MovedMessages | null>;
  close(): Promise<void>;
}

export type MailboxConnector = (
  server: MailServer,
  auth: MailboxAuth,
) => Promise<MailboxSession>;
