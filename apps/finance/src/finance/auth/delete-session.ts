import { hashToken } from "@tuja/server-auth/hash-token";
import { eq } from "drizzle-orm";
import { sessions } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";

export async function deleteSession(
  db: FinanceAppDb,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
