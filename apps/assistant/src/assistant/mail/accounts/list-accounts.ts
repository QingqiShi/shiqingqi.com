import { asc, eq } from "drizzle-orm";
import {
  DEFAULT_TIME_ZONE,
  mailAccounts,
  userSettings,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";

/** The accounts page: each account with its last check and errors, and the user's time zone. */
export async function listAccounts({ db, userId }: UserScope) {
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
      writeErrorCode: mailAccounts.writeErrorCode,
      writeErrorMessage: mailAccounts.writeErrorMessage,
      writeErrorAt: mailAccounts.writeErrorAt,
    })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId))
    .orderBy(asc(mailAccounts.createdAt));
  const settings = (
    await db
      .select({ timeZone: userSettings.timeZone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
  ).at(0);
  return { accounts, timeZone: settings?.timeZone ?? DEFAULT_TIME_ZONE };
}

export type AccountSummary = Awaited<
  ReturnType<typeof listAccounts>
>["accounts"][number];
