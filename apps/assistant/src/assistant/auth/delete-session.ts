import { eq } from "drizzle-orm";
import { sessions } from "#src/assistant/db/schema.ts";
import type { AssistantAppDb } from "#src/assistant/db/with-user.ts";
import { hashToken } from "./hash-token.ts";

export async function deleteSession(
  db: AssistantAppDb,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
