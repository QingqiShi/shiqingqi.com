import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { mailAccounts, type MailProvider } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  accountCredential,
  type AccountCredential,
} from "#src/assistant/mail/accounts/account-credential.ts";
import { ownAccount } from "./own-account.ts";

/**
 * Stores a login that the mail server accepted. Connecting an address again
 * replaces its login and clears its error.
 */
export async function saveAccount(
  { db, userId }: UserScope,
  {
    provider,
    address,
    credential,
    credentialKey,
    now,
  }: {
    provider: MailProvider;
    address: string;
    credential: AccountCredential;
    credentialKey: Uint8Array;
    now: Date;
  },
): Promise<{ accountId: string }> {
  const normalised = address.trim().toLowerCase();
  const existing = (
    await db
      .select({ id: mailAccounts.id })
      .from(mailAccounts)
      .where(
        and(
          eq(mailAccounts.userId, userId),
          eq(mailAccounts.provider, provider),
          eq(mailAccounts.address, normalised),
        ),
      )
  ).at(0);
  const accountId = existing?.id ?? randomUUID();
  const sealed = accountCredential.seal(credential, credentialKey, {
    userId,
    accountId,
  });
  if (existing) {
    await db
      .update(mailAccounts)
      .set({
        credential: sealed,
        status: "ok",
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorAt: null,
        updatedAt: now,
      })
      .where(ownAccount(userId, accountId));
  } else {
    await db.insert(mailAccounts).values({
      id: accountId,
      userId,
      provider,
      address: normalised,
      credential: sealed,
    });
  }
  return { accountId };
}
