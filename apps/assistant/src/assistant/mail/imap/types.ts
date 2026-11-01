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

/**
 * One logged-in IMAP connection. It only reads: a folder opens read-only and
 * a fetch uses BODY.PEEK, so sync never marks mail read.
 */
export interface MailboxSession {
  /** Every folder, with message and unseen counts for each selectable one. */
  listFolders(): Promise<MailboxFolder[]>;
  openFolder(path: string): Promise<OpenedFolder>;
  /** The UIDs above `uid` in the open folder, in ascending order. */
  listUidsAfter(uid: number): Promise<number[]>;
  /** The UIDs of mail the open folder received on or after `since`, ascending. */
  listUidsSince(since: Date): Promise<number[]>;
  fetchMessages(uids: number[], maxBytes: number): Promise<FetchedMessage[]>;
  close(): Promise<void>;
}

export type MailboxConnector = (
  server: MailServer,
  auth: MailboxAuth,
) => Promise<MailboxSession>;
