import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb, UserScope } from "#src/assistant/db/types.ts";

const readHealthOf = cache(async (db: AssistantDb, userId: string) => {
  const rows = await db
    .select({
      address: mailAccounts.address,
      status: mailAccounts.status,
      lastErrorAt: mailAccounts.lastErrorAt,
      lastErrorCode: mailAccounts.lastErrorCode,
    })
    .from(mailAccounts)
    .where(eq(mailAccounts.userId, userId))
    .orderBy(asc(mailAccounts.createdAt));
  return {
    connected: rows.length,
    reconnect: rows
      .filter((row) => row.status === "reconnect")
      .map(({ address, lastErrorAt, lastErrorCode }) => ({
        address,
        since: lastErrorAt,
        code: lastErrorCode,
      })),
  };
});

/** How many mailboxes the user connected, and which must be connected again. */
export function readMailboxHealth({ db, userId }: UserScope) {
  return readHealthOf(db, userId);
}

export type MailboxHealth = Awaited<ReturnType<typeof readMailboxHealth>>;
