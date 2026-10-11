import { randomUUID } from "node:crypto";
import { users } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";

/**
 * Creates a user and binds it to a member that has no user yet, as a claim
 * without a passkey. Returns the user's id. Call it inside a transaction.
 */
export async function bindNewUserToMember(
  tx: FinanceDb,
  {
    householdId,
    memberId,
    displayName,
  }: { householdId: string; memberId: string; displayName: string },
): Promise<string> {
  const userId = randomUUID();
  await tx.insert(users).values({ id: userId, displayName });
  if (!(await bindUserToMember(tx, { householdId, memberId, userId }))) {
    throw new Error(`Member ${memberId} has a user already.`);
  }
  return userId;
}
