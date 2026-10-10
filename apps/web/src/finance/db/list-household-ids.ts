import { households } from "./schema.ts";
import type { FinanceDb } from "./types.ts";

/** Every Household, for jobs that run across all of them. Only a cron may call this. */
export async function listHouseholdIds(db: FinanceDb) {
  const rows = await db
    .select({ id: households.id })
    .from(households)
    .orderBy(households.id);
  return rows.map((row) => row.id);
}
