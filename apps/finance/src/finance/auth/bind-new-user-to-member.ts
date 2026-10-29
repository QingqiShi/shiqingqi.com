import { randomUUID } from "node:crypto";
import { users } from "#src/finance/db/schema.ts";
import {
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { bindUserToMember } from "./bind-user-to-member.ts";

/**
 * Creates a user and binds it to a member that has no user yet, as a claim
 * without a passkey. Returns the user's id.
 */
export async function bindNewUserToMember(
  db: FinanceAppDb,
  {
    householdId,
    memberId,
    displayName,
  }: { householdId: string; memberId: string; displayName: string },
): Promise<string> {
  const userId = randomUUID();
  await db.insert(users).values({ id: userId, displayName });
  const bound = await withHousehold(db, householdId, (scope) =>
    bindUserToMember(scope, { memberId, userId }),
  );
  if (!bound) throw new Error(`Member ${memberId} has a user already.`);
  return userId;
}
