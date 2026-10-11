import { randomUUID } from "node:crypto";
import { createHousehold } from "../../auth/create-household.ts";
import type { FinanceDb } from "../types.ts";
import { withHousehold } from "../with-household.ts";

type CreateHouseholdInput = Parameters<typeof createHousehold>[1];

/** `createHousehold` with a new id, in a transaction of its own. */
export async function createTestHousehold(
  db: FinanceDb,
  input: CreateHouseholdInput,
) {
  const householdId = randomUUID();
  const created = await withHousehold(db, householdId, (scope) =>
    createHousehold(scope, input),
  );
  return { householdId, ...created };
}
