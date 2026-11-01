import { and, eq } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";

/** The account `accountId`, when it belongs to `userId`. */
export function ownAccount(userId: string, accountId: string) {
  return and(eq(mailAccounts.userId, userId), eq(mailAccounts.id, accountId));
}
