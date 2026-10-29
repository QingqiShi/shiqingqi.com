import { and, eq, isNotNull } from "drizzle-orm";
import { users } from "#src/finance/db/schema.ts";
import type { FinanceAppDb } from "#src/finance/db/with-household.ts";

/** True when a user has `email` as a verified Recovery email. */
export async function isEmailRegistered(
  db: FinanceAppDb,
  email: string,
): Promise<boolean> {
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNotNull(users.emailVerifiedAt)))
    .limit(1);
  return found.length > 0;
}
