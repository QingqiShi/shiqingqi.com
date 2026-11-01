import { asc, eq, sql } from "drizzle-orm";
import {
  DEFAULT_TIME_ZONE,
  mailAccounts,
  mailFolders,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";

/** The accounts page: each account with its sync state and folder counts, and the user's time zone. */
export async function listAccounts({ db }: UserScope) {
  const accounts = await db
    .select({
      id: mailAccounts.id,
      provider: mailAccounts.provider,
      address: mailAccounts.address,
      status: mailAccounts.status,
      lastSyncedAt: mailAccounts.lastSyncedAt,
      lastErrorCode: mailAccounts.lastErrorCode,
      lastErrorMessage: mailAccounts.lastErrorMessage,
      lastErrorAt: mailAccounts.lastErrorAt,
      folders: sql<number>`count(${mailFolders.id})::int`,
      inboxUnseen: sql<
        number | null
      >`max(${mailFolders.unseenCount}) filter (where upper(${mailFolders.path}) = 'INBOX')`,
    })
    .from(mailAccounts)
    .leftJoin(mailFolders, eq(mailFolders.accountId, mailAccounts.id))
    .groupBy(mailAccounts.id)
    .orderBy(asc(mailAccounts.createdAt));
  const settings = (
    await db.select({ timeZone: userSettings.timeZone }).from(userSettings)
  ).at(0);
  return { accounts, timeZone: settings?.timeZone ?? DEFAULT_TIME_ZONE };
}

export type AccountSummary = Awaited<
  ReturnType<typeof listAccounts>
>["accounts"][number];
