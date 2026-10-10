import { eq } from "drizzle-orm";
import { sessions } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { hashToken } from "./hash-token.ts";

export async function deleteSession(
  db: FinanceDb,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
