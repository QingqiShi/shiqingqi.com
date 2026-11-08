import { eq } from "drizzle-orm";
import "server-only";
import { getPageSession } from "../auth/get-page-session.ts";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { accounts } from "../db/schema.ts";

/**
 * The signed-in visitor's account, for a server component. Null without a
 * session cookie, so that a visitor who never signed in reads no Postgres.
 */
export async function getPageAccount(): Promise<{
  userId: string;
  name: string;
  isPublic: boolean;
} | null> {
  const db = getBuddyDb();
  const session = db ? await getPageSession() : null;
  if (!db || !session) return null;
  const rows = await db
    .select({ name: accounts.name, isPublic: accounts.isPublic })
    .from(accounts)
    .where(eq(accounts.id, session.userId))
    .limit(1);
  const account = rows.at(0);
  return account ? { userId: session.userId, ...account } : null;
}
