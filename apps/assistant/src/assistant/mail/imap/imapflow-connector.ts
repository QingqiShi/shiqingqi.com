import {
  ImapFlow,
  type FetchMessageObject,
  type ImapFlowError,
  type MessageAddressObject,
  type SearchObject,
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

/** An imapflow connector with no logging, so no secret reaches a log. Only tests turn `tls` off. */
export const createImapflowConnector =
  ({ tls }: { tls: boolean }): MailboxConnector =>
  async (server, auth) => {
    const client = new ImapFlow({
      host: server.host,
      port: server.port,
      secure: tls,
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

    /**
     * Selects INBOX read-only in place of the open folder before a RENAME or
     * DELETE. CLOSE expunges mail that another client flagged \Deleted, and
     * imapflow sends CLOSE itself when the folder to change is open and the
     * server has no UNSELECT. A new SELECT or EXAMINE does not expunge.
     */
    async function leaveOpenFolder(path: string) {
      if (path.toUpperCase() === "INBOX") {
        throw new Error("INBOX cannot be renamed or deleted");
      }
      const open = client.mailbox;
      if (open && open.path !== "INBOX") {
        await client.mailboxOpen("INBOX", { readOnly: true });
      }
    }

    const session: MailboxSession = {
      async listFolders() {
        const listed = await client.list();
        return listed.map((folder): MailboxFolder => ({
          path: folder.path,
          name: folder.name,
          delimiter: folder.delimiter || null,
          specialUse: folder.specialUse ?? null,
          selectable: !folder.flags.has("\\Noselect"),
        }));
      },
      async createFolder(path) {
        await client.mailboxCreate(path);
        await client.mailboxSubscribe(path);
      },
      async renameFolder(path, newPath) {
        await leaveOpenFolder(path);
        await client.mailboxRename(path, newPath);
        await client.mailboxSubscribe(newPath);
      },
      async deleteEmptyFolder(path) {
        await leaveOpenFolder(path);
        const status = await client.status(path, { messages: true });
        if (!status || status.messages !== 0) {
          throw new Error(`The folder ${path} is not empty`);
        }
        await client.mailboxDelete(path);
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
      async searchUids(criteria) {
        const query: SearchObject = {};
        if (criteria.since) query.since = criteria.since;
        if (criteria.before) query.before = criteria.before;
        if (criteria.seen !== undefined) query.seen = criteria.seen;
        if (criteria.messageId)
          query.header = { "message-id": criteria.messageId };
        return ascending(
          await client.search(
            Object.keys(query).length > 0 ? query : { all: true },
            {
              uid: true,
            },
          ),
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
      async addFlags(uids, flags) {
        if (uids.length === 0) return;
        if (!(await client.messageFlagsAdd(uids, flags, { uid: true }))) {
          throw new Error("The mail server did not set the flags");
        }
      },
      async removeFlags(uids, flags) {
        if (uids.length === 0) return;
        if (!(await client.messageFlagsRemove(uids, flags, { uid: true }))) {
          throw new Error("The mail server did not remove the flags");
        }
      },
      async moveMessages(uids, destination) {
        if (uids.length === 0) return null;
        if (!client.capabilities.has("MOVE")) throw new MoveUnsupportedError();
        const moved = await client.messageMove(uids, destination, {
          uid: true,
        });
        if (!moved) throw new Error("The mail server did not move the mail");
        return moved.uidMap && moved.uidValidity !== undefined
          ? { uidValidity: Number(moved.uidValidity), uidMap: moved.uidMap }
          : null;
      },
      isUsable() {
        return client.usable;
      },
      async close() {
        await client.logout().catch(() => {
          client.close();
        });
      },
    };
    return session;
  };

/** The real connector: imapflow over TLS. */
export const imapflowConnector = createImapflowConnector({ tls: true });
