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

/** What `searchUids` matches in the open folder. Every criterion that is set must match; none matches all mail. */
export interface MailSearch {
  /** Received on or after the date of this time. IMAP compares dates only, in the server's time zone. */
  since?: Date;
  /** Received before the date of this time. */
  before?: Date;
  /** True for read mail only, false for unread mail only. */
  seen?: boolean;
  /** The Message-ID header, in angle brackets. */
  messageId?: string;
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
  /** Every folder. */
  listFolders(): Promise<MailboxFolder[]>;
  /** Makes a folder and subscribes to it; a folder that is already there is kept as it is. */
  createFolder(path: string): Promise<void>;
  /** Renames a folder, with the folders inside it, and subscribes to the new path. */
  renameFolder(path: string, newPath: string): Promise<void>;
  /** Deletes a folder that holds no mail; throws when the server says it holds some. */
  deleteEmptyFolder(path: string): Promise<void>;
  /** Whether the server has the MOVE command, which `moveMessages` needs. */
  supportsMove(): boolean;
  openFolder(
    path: string,
    options?: { write?: boolean },
  ): Promise<OpenedFolder>;
  /** The UIDs of the mail in the open folder that matches, ascending. */
  searchUids(criteria: MailSearch): Promise<number[]>;
  fetchMessages(uids: number[], maxBytes: number): Promise<FetchedMessage[]>;
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
  /** False once the connection has closed, for example after the server timed out an idle connection. */
  isUsable(): boolean;
  close(): Promise<void>;
}

export type MailboxConnector = (
  server: MailServer,
  auth: MailboxAuth,
) => Promise<MailboxSession>;
