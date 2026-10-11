import { eq } from "drizzle-orm";
import { sessions } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";
import { hashToken } from "./hash-token.ts";

export async function deleteSession(
  db: FinanceAppDb,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
