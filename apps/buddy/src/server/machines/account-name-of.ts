import { eq } from "drizzle-orm";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";

export async function accountNameOf(db: BuddyDb, userId: string) {
  const rows = await db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, userId))
    .limit(1);
  return rows.at(0)?.name ?? null;
}
