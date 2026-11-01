import {
  ImapFlow,
  type FetchMessageObject,
  type MessageAddressObject,
} from "imapflow";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type {
  FetchedMessage,
  MailAddress,
  MailboxConnector,
  MailboxFolder,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";

const TIMEOUT_MS = 30_000;

function addressesOf(list: MessageAddressObject[] | undefined): MailAddress[] {
  return (list ?? []).map((entry) => ({
    name: entry.name || null,
    address: entry.address || null,
  }));
}

function dateOf(value: Date | string | undefined): Date | null {
  if (value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toFetchedMessage(message: FetchMessageObject): FetchedMessage {
  const envelope = message.envelope;
  return {
    uid: message.uid,
    flags: [...(message.flags ?? [])],
    internalDate: dateOf(message.internalDate),
    size: message.size ?? null,
    envelope: {
      date: dateOf(envelope?.date),
      subject: envelope?.subject ?? null,
      messageId: envelope?.messageId ?? null,
      inReplyTo: envelope?.inReplyTo ?? null,
      from: addressesOf(envelope?.from),
      replyTo: addressesOf(envelope?.replyTo),
      to: addressesOf(envelope?.to),
      cc: addressesOf(envelope?.cc),
    },
    source: new Uint8Array(message.source ?? []),
  };
}

function ascending(uids: number[] | false | undefined): number[] {
  return [...(uids || [])].sort((a, b) => a - b);
}

/** The real connector: imapflow over TLS, with no logging, so no secret reaches a log. */
export const imapflowConnector: MailboxConnector = async (server, auth) => {
  const client = new ImapFlow({
    host: server.host,
    port: server.port,
    secure: true,
    auth,
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS * 2,
  });
  // A socket error after connect would otherwise end the process.
  client.on("error", () => undefined);
  try {
    await client.connect();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "authenticationFailed" in error &&
      error.authenticationFailed
    ) {
      throw new MailboxAuthError();
    }
    throw error;
  }

  const session: MailboxSession = {
    async listFolders() {
      const listed = await client.list({
        statusQuery: { messages: true, unseen: true },
      });
      return listed.map((folder): MailboxFolder => ({
        path: folder.path,
        name: folder.name,
        delimiter: folder.delimiter || null,
        specialUse: folder.specialUse ?? null,
        selectable: !folder.flags.has("\\Noselect"),
        messages: folder.status?.messages ?? null,
        unseen: folder.status?.unseen ?? null,
      }));
    },
    async openFolder(path) {
      const opened = await client.mailboxOpen(path, { readOnly: true });
      return {
        uidValidity: Number(opened.uidValidity),
        uidNext: opened.uidNext,
      };
    },
    async listUidsAfter(uid) {
      const found = await client.search(
        { uid: `${String(uid + 1)}:*` },
        { uid: true },
      );
      // `n:*` matches the newest message even when its UID is below n.
      return ascending(found).filter((found) => found > uid);
    },
    async listUidsSince(since) {
      return ascending(await client.search({ since }, { uid: true }));
    },
    async fetchMessages(uids, maxBytes) {
      if (uids.length === 0) return [];
      const fetched = await client.fetchAll(
        uids,
        {
          uid: true,
          flags: true,
          envelope: true,
          internalDate: true,
          size: true,
          source: { start: 0, maxLength: maxBytes },
        },
        { uid: true },
      );
      return fetched.map(toFetchedMessage);
    },
    async close() {
      await client.logout().catch(() => {
        client.close();
      });
    },
  };
  return session;
};
