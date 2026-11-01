import { and, eq, ne, sql } from "drizzle-orm";
import { mailAccounts, userSettings } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  organiseAccount,
  type OrganiseAccountResult,
  type OrganiseDeps,
} from "./organise-account.ts";

export interface OrganiseUserResult {
  /** False when the user has not turned organising on: no mailbox was opened. */
  enabled: boolean;
  accounts: number;
  failedAccounts: number;
  moved: number;
  createdFolders: number;
  left: number;
  remaining: number;
}

/**
 * Organises each of a user's accounts that does not wait for a new
 * connect, only while the user has organising on. Each account gets an
 * equal share of the time that is left, so a full inbox cannot stop the
 * others.
 */
export async function organiseUserMail(
  { db, userId, endsAt }: { db: AssistantDb; userId: string; endsAt: number },
  deps: OrganiseDeps,
): Promise<OrganiseUserResult> {
  const settings = (
    await db
      .select({
        enabled: userSettings.organiseEnabled,
        notes: userSettings.organiseNotes,
        locale: userSettings.locale,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
  ).at(0);
  const accounts = await db
    .select({
      id: mailAccounts.id,
      provider: mailAccounts.provider,
      address: mailAccounts.address,
      credential: mailAccounts.credential,
    })
    .from(mailAccounts)
    .where(
      and(
        eq(mailAccounts.userId, userId),
        ne(mailAccounts.status, "reconnect"),
      ),
    )
    .orderBy(sql`${mailAccounts.lastSyncedAt} asc nulls first`);
  const result: OrganiseUserResult = {
    enabled: settings?.enabled === true,
    accounts: 0,
    failedAccounts: 0,
    moved: 0,
    createdFolders: 0,
    left: 0,
    remaining: 0,
  };
  if (!settings?.enabled) return result;
  for (const [index, account] of accounts.entries()) {
    const current = deps.auth.now().getTime();
    if (current >= endsAt) break;
    const organised: OrganiseAccountResult = await organiseAccount(
      {
        db,
        userId,
        account,
        settings,
        endsAt: current + (endsAt - current) / (accounts.length - index),
      },
      deps,
    );
    result.accounts += 1;
    if (!organised.ok) result.failedAccounts += 1;
    result.moved += organised.moved;
    result.createdFolders += organised.createdFolders;
    result.left += organised.left;
    result.remaining += organised.remaining;
  }
  return result;
}
