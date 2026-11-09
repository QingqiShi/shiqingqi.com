import { hashToken } from "@tuja/server-auth/hash-token";
import { eq } from "drizzle-orm";
import { sessions } from "#src/server/db/schema.ts";
import type { BuddyDb } from "#src/server/db/types.ts";

export async function deleteSession(db: BuddyDb, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
