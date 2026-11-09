import { hashToken } from "@tuja/server-auth/hash-token";
import { eq } from "drizzle-orm";
import { sessions } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";

export async function deleteSession(
  db: AssistantDb,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
