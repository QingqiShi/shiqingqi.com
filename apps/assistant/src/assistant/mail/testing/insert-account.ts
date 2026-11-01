import { randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { mailAccounts, users } from "#src/assistant/db/schema.ts";
import type { TestDb } from "#src/assistant/db/testing/create-test-db.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import {
  accountCredential,
  type AccountCredential,
} from "#src/assistant/mail/accounts/account-credential.ts";
import type { MailboxConnector } from "#src/assistant/mail/imap/types.ts";
import type { Fetch } from "#src/assistant/mail/oauth/types.ts";
import { saveAccount } from "../accounts/save-account.ts";
import type { SyncUserMailDeps } from "../sync/sync-user-mail.ts";

export const TEST_CREDENTIAL_KEY = new Uint8Array(randomBytes(32));

export async function insertUser(db: TestDb) {
  const userId = randomUUID();
  await db.insert(users).values({ id: userId, displayName: "Test" });
  return userId;
}

export async function insertAccount(
  db: TestDb,
  userId: string,
  {
    provider = "icloud",
    address = "me@icloud.com",
    credential = { type: "password", password: "app-password" },
  }: {
    provider?: "icloud" | "gmail" | "outlook";
    address?: string;
    credential?: AccountCredential;
  } = {},
) {
  const { accountId } = await withUser(db, userId, (scope) =>
    saveAccount(scope, {
      provider,
      address,
      credential,
      credentialKey: TEST_CREDENTIAL_KEY,
      now: new Date(),
    }),
  );
  return accountId;
}

export async function storedAccount(
  db: TestDb,
  userId: string,
  accountId: string,
) {
  const [account] = await withUser(db, userId, ({ db }) =>
    db.select().from(mailAccounts).where(eq(mailAccounts.id, accountId)),
  );
  return {
    ...account,
    opened: accountCredential.open(account.credential, TEST_CREDENTIAL_KEY, {
      userId,
      accountId,
    }),
  };
}

export function mailDeps({
  connector,
  fetch = () => Promise.reject(new Error("No fetch in this test")),
  now = () => new Date(),
}: {
  connector: MailboxConnector;
  fetch?: Fetch;
  now?: () => Date;
}): SyncUserMailDeps {
  return {
    connector,
    auth: {
      credentialKey: TEST_CREDENTIAL_KEY,
      oauthClient: () => ({
        clientId: "client-id",
        clientSecret: "client-secret",
      }),
      fetch,
      now,
    },
  };
}
