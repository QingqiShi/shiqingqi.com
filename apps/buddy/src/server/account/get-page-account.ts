import "server-only";
import { getPageSession } from "../auth/get-page-session.ts";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { ownAccount } from "./own-account.ts";

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
  const account = await ownAccount(db, session.userId);
  return account ? { userId: session.userId, ...account } : null;
}
