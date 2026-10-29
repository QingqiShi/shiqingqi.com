import { randomUUID } from "node:crypto";
import { lookups } from "../../db/lookups.ts";
import { households } from "../../db/schema.ts";
import type { FinanceDb } from "../../db/types.ts";
import { asFinanceApp, withHousehold } from "../../db/with-household.ts";
import { generateWeeklyReports } from "../../reports/generate-weekly-reports.ts";
import {
  seedSyntheticHousehold,
  type SyntheticHousehold,
  type SyntheticHouseholdOptions,
} from "./seed-synthetic-household.ts";

/** Another seed than `finance:seed` uses, so that both fit in one database. */
const DEMO_SEED = 2;

/**
 * Seeds the synthetic Household as the demo that the sign-in page opens
 * read-only: its owner, Alex, gets a user that every demo session shares.
 * Its weekly Reports are made too, because a demo session cannot ask for
 * them. Throws when the database has a demo already.
 */
export async function seedDemoHousehold(
  db: FinanceDb,
  options: Omit<SyntheticHouseholdOptions, "ownerUserId"> = {},
): Promise<SyntheticHousehold> {
  const existing = await asFinanceApp(db, (tx) => lookups.demoOwner(tx));
  if (existing) {
    throw new Error(
      `The database has a demo Household already: ${existing.householdId}.`,
    );
  }
  const household = await seedSyntheticHousehold(db, {
    ...options,
    seed: options.seed ?? DEMO_SEED,
    ownerUserId: randomUUID(),
  });
  await withHousehold(db, household.householdId, (scope) =>
    scope.db.update(households).set({ demo: true }),
  );
  await generateWeeklyReports(db, household.householdId, new Date(), "all");
  return household;
}
