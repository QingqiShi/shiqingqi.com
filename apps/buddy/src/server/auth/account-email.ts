import { eq } from "drizzle-orm";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";

/**
 * The email of the signed-in account, to show it to its owner. The email is
 * sign-in data, which `buddy_app` cannot read, so sign-in reads it as the
 * owner of the tables. Pass only the user id of the session.
 */
export async function accountEmail(
  db: BuddyDb,
  userId: string,
): Promise<string | null> {
  const rows = await db
    .select({ email: accounts.email })
    .from(accounts)
    .where(eq(accounts.id, userId))
    .limit(1);
  return rows.at(0)?.email ?? null;
}
