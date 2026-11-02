import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { MAIL_SERVERS } from "#src/assistant/mail/imap/mail-servers.ts";
import { MailboxAuthError } from "#src/assistant/mail/imap/mailbox-auth-error.ts";
import type {
  MailboxConnector,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import { ownAccount } from "./own-account.ts";
import {
  CredentialUnreadableError,
  resolveMailboxAuth,
  type MailboxAuthDeps,
  type StoredAccount,
} from "./resolve-mailbox-auth.ts";

export interface MailboxDeps {
  connector: MailboxConnector;
  auth: MailboxAuthDeps;
}

export async function storedCredential(
  db: AssistantDb,
  userId: string,
  accountId: string,
) {
  const row = (
    await db
      .select({ credential: mailAccounts.credential })
      .from(mailAccounts)
      .where(ownAccount(userId, accountId))
  ).at(0);
  if (!row) throw new CredentialUnreadableError();
  return row.credential;
}

/**
 * Logs in to the mailbox of an account. When the server refuses an OAuth
 * access token that has not expired yet, as Outlook sometimes does, it gets
 * a new token and tries once more; only a second refusal throws
 * `MailboxAuthError`.
 */
export async function openMailboxSession(
  db: AssistantDb,
  userId: string,
  account: StoredAccount,
  deps: MailboxDeps,
): Promise<MailboxSession> {
  const server = MAIL_SERVERS[account.provider];
  const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
  try {
    return await deps.connector(server, auth);
  } catch (error) {
    if (!(error instanceof MailboxAuthError) || !("accessToken" in auth)) {
      throw error;
    }
  }
  const refreshed = await resolveMailboxAuth(
    db,
    userId,
    // The first resolve can store a new refresh token. Read it again.
    {
      ...account,
      credential: await storedCredential(db, userId, account.id),
    },
    deps.auth,
    { forceRefresh: true },
  );
  return deps.connector(server, refreshed);
}
