import {
  ImapFlow,
  type FetchMessageObject,
  type ImapFlowError,
  type MessageAddressObject,
} from "imapflow";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import { MoveUnsupportedError } from "#src/assistant/mail/imap/move-unsupported-error.ts";
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

function isAuthenticationFailure(error: unknown): error is ImapFlowError {
  return (
    error instanceof Error &&
    "authenticationFailed" in error &&
    error.authenticationFailed === true
  );
}

/** The server's own words, such as Outlook's "AUTHENTICATE failed.", so that the account shows why. */
function refusalMessage(error: ImapFlowError) {
  const text =
    error.responseText ??
    (typeof error.response === "string" ? error.response : null);
  const detail = [error.serverResponseCode, text]
    .filter((part) => typeof part === "string" && part.trim() !== "")
    .join(" ");
  return detail === ""
    ? undefined
    : `The mail server refused the login: ${detail}`;
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
    if (isAuthenticationFailure(error)) {
      throw new MailboxAuthError(refusalMessage(error));
    }
    throw error;
  }

  const session: MailboxSession = {
    async listFolders(options) {
      const listed = await client.list(
        options?.counts === false
          ? {}
          : { statusQuery: { messages: true, unseen: true } },
      );
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
    async createFolder(path) {
      await client.mailboxCreate(path);
      await client.mailboxSubscribe(path);
    },
    supportsMove() {
      return client.capabilities.has("MOVE");
    },
    async openFolder(path, options) {
      const opened = await client.mailboxOpen(path, {
        readOnly: options?.write !== true,
      });
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
    async listUidsBetween(low, high) {
      if (high < low) return [];
      const found = await client.search(
        { uid: `${String(low)}:${String(high)}` },
        { uid: true },
      );
      return ascending(found).filter((uid) => uid >= low && uid <= high);
    },
    async listUidsSince(since, before) {
      return ascending(
        await client.search(before ? { since, before } : { since }, {
          uid: true,
        }),
      );
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
    async listPresentUids(uids) {
      if (uids.length === 0) return [];
      return ascending(
        await client.search({ uid: uids.join(",") }, { uid: true }),
      );
    },
    async findUidsByMessageId(messageId) {
      return ascending(
        await client.search(
          { header: { "message-id": messageId } },
          { uid: true },
        ),
      );
    },
    async addFlags(uids, flags) {
      if (uids.length === 0) return;
      if (!(await client.messageFlagsAdd(uids, flags, { uid: true }))) {
        throw new Error("The mail server did not set the flags");
      }
    },
    async removeFlags(uids, flags) {
      if (uids.length === 0) return;
      if (!(await client.messageFlagsRemove(uids, flags, { uid: true }))) {
        throw new Error("The mail server did not clear the flags");
      }
    },
    async moveMessages(uids, destination) {
      if (uids.length === 0) return null;
      if (!client.capabilities.has("MOVE")) throw new MoveUnsupportedError();
      const moved = await client.messageMove(uids, destination, { uid: true });
      if (!moved) throw new Error("The mail server did not move the mail");
      return moved.uidMap && moved.uidValidity !== undefined
        ? { uidValidity: Number(moved.uidValidity), uidMap: moved.uidMap }
        : null;
    },
    async close() {
      await client.logout().catch(() => {
        client.close();
      });
    },
  };
  return session;
};
