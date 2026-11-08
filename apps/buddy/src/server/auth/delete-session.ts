import { eq } from "drizzle-orm";
import { sessions } from "#src/server/db/schema.ts";
import type { BuddyDb } from "#src/server/db/types.ts";
import { hashToken } from "./hash-token.ts";

export async function deleteSession(db: BuddyDb, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
