import { lookups } from "./lookups.ts";
import type { FinanceDb } from "./types.ts";
import { asFinanceApp } from "./with-household.ts";

/** Every Household, for jobs that run across all of them. Only a cron or a CLI may call this. */
export function listHouseholdIds(db: FinanceDb): Promise<string[]> {
  return asFinanceApp(db, (tx) => lookups.householdIds(tx));
}
