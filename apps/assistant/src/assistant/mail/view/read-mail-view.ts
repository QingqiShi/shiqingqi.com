import { and, desc, eq, isNotNull } from "drizzle-orm";
import PostalMime from "postal-mime";
import {
  agentActions,
  mailAccounts,
  type MailProvider,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { recordAccountError } from "#src/assistant/mail/accounts/check-account.ts";
import { describeSyncError } from "#src/assistant/mail/accounts/describe-sync-error.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { ownAccount } from "#src/assistant/mail/accounts/own-account.ts";
import type { MailImageLinks } from "#src/assistant/mail/images/make-mail-image-links.ts";
import type {
  MailAddress,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import { findMailAnywhere } from "./find-mail-anywhere.ts";
import { type MailFrame, mailFrameDocument } from "./mail-frame-document.ts";

/** The most of a mail the page reads; a larger mail shows cut off. */
const MAX_MAIL_BYTES = 10 * 1024 * 1024;

export interface MailView {
  subject: string;
  from: MailAddress | null;
  to: MailAddress[];
  cc: MailAddress[];
  sentAt: Date | null;
  folder: string;
  body: ({ kind: "html" } & MailFrame) | { kind: "text"; text: string };
  attachments: string[];
  /** The mail is larger than the page reads, so its end is missing. */
  truncated: boolean;
}

interface MailAccountView {
  provider: MailProvider;
  address: string;
}

/** The headers that the agents' actions on the mail kept, for when the mail cannot be read. */
export interface KnownMailHeaders {
  subject: string | null;
  sender: string | null;
}

interface MailProblem<Kind extends string> {
  kind: Kind;
  account: MailAccountView;
  known: KnownMailHeaders | null;
}

export type MailViewResult =
  | { kind: "found"; account: MailAccountView; mail: MailView }
  /** No folder holds it: deleted, or never in this mailbox. */
  | MailProblem<"not-found">
  /** Only a new connect can open the mailbox, for the reason that `code` names. */
  | (MailProblem<"reconnect"> & { code: string | null })
  /** The mail server or the app's setup failed; a later try can work. */
  | MailProblem<"unavailable">;

async function knownHeaders(
  { db, userId }: UserScope,
  accountId: string,
  messageId: string,
): Promise<KnownMailHeaders | null> {
  const row = (
    await db
      .select({ subject: agentActions.subject, sender: agentActions.sender })
      .from(agentActions)
      .where(
        and(
          eq(agentActions.userId, userId),
          eq(agentActions.accountId, accountId),
          eq(agentActions.messageId, messageId),
          isNotNull(agentActions.subject),
        ),
      )
      .orderBy(desc(agentActions.createdAt))
      .limit(1)
  ).at(0);
  return row ?? null;
}

/** The folder the agents last moved the mail into, where it most likely is. */
async function likelyFolder(
  { db, userId }: UserScope,
  accountId: string,
  messageId: string,
) {
  const move = (
    await db
      .select({
        fromFolder: agentActions.fromFolder,
        toFolder: agentActions.toFolder,
        undoneAt: agentActions.undoneAt,
      })
      .from(agentActions)
      .where(
        and(
          eq(agentActions.userId, userId),
          eq(agentActions.accountId, accountId),
          eq(agentActions.messageId, messageId),
          eq(agentActions.kind, "move"),
        ),
      )
      .orderBy(desc(agentActions.createdAt))
      .limit(1)
  ).at(0);
  if (!move) return null;
  return move.undoneAt ? move.fromFolder : move.toFolder;
}

async function readFound(
  session: MailboxSession,
  messageId: string,
  likely: string | null,
  imageLinks: Promise<MailImageLinks | null>,
): Promise<MailView | null> {
  const found = await findMailAnywhere(session, messageId, {
    maxBytes: MAX_MAIL_BYTES,
    likely,
  });
  if (!found) return null;
  const { folder, message } = found;
  const { envelope } = message;
  const parsed = await PostalMime.parse(message.source, {
    attachmentEncoding: "base64",
  });
  const html = parsed.html?.trim() ? parsed.html : null;
  const sentAt = envelope.date ?? (parsed.date ? new Date(parsed.date) : null);
  return {
    subject: envelope.subject ?? parsed.subject ?? "",
    from: envelope.from.at(0) ?? null,
    to: envelope.to,
    cc: envelope.cc,
    sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : null,
    folder: folder.path,
    body: html
      ? {
          kind: "html",
          ...mailFrameDocument(html, parsed.attachments, await imageLinks),
        }
      : { kind: "text", text: parsed.text ?? "" },
    attachments: parsed.attachments.flatMap((attachment) =>
      attachment.related || attachment.disposition === "inline"
        ? []
        : [attachment.filename ?? attachment.mimeType],
    ),
    truncated: (message.size ?? 0) > MAX_MAIL_BYTES,
  };
}

/**
 * Null when the account is not the user's. A login that only a new connect
 * can fix goes on the account, as a run puts it, so that Mailboxes and Home
 * ask for that connect.
 */
export async function readMailView(
  scope: UserScope,
  deps: MailboxDeps | null,
  accountId: string,
  messageId: string,
  imageLinks: Promise<MailImageLinks | null>,
): Promise<MailViewResult | null> {
  const stored = (
    await scope.db
      .select({
        id: mailAccounts.id,
        provider: mailAccounts.provider,
        address: mailAccounts.address,
        credential: mailAccounts.credential,
        status: mailAccounts.status,
        lastErrorCode: mailAccounts.lastErrorCode,
      })
      .from(mailAccounts)
      .where(ownAccount(scope.userId, accountId))
  ).at(0);
  if (!stored) return null;
  const account = { provider: stored.provider, address: stored.address };
  const problem = async <Kind extends string>(kind: Kind) => ({
    kind,
    account,
    known: await knownHeaders(scope, accountId, messageId).catch(() => null),
  });
  if (stored.status === "reconnect") {
    return { ...(await problem("reconnect")), code: stored.lastErrorCode };
  }
  if (!deps) return problem("unavailable");

  const likely = likelyFolder(scope, accountId, messageId).catch(() => null);
  let session: MailboxSession | null = null;
  try {
    session = await openMailboxSession(scope.db, scope.userId, stored, deps);
    const mail = await readFound(session, messageId, await likely, imageLinks);
    return mail ? { kind: "found", account, mail } : await problem("not-found");
  } catch (error) {
    const { status, code } = describeSyncError(error);
    if (status !== "reconnect") return await problem("unavailable");
    await recordAccountError(
      scope.db,
      scope.userId,
      accountId,
      error,
      deps.auth.now(),
    ).catch(() => undefined);
    return { ...(await problem("reconnect")), code };
  } finally {
    await session?.close().catch(() => undefined);
  }
}
