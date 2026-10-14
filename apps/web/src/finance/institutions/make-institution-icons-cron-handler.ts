import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import {
  refreshInstitutionIcons,
  type RefreshInstitutionIconsDependencies,
} from "./refresh-institution-icons.ts";

/** Below the route's `maxDuration` of 300 s, with time left to write the last guesses. */
const RUN_BUDGET_MS = 280_000;

type InstitutionIconsCronDependencies = HouseholdCronDependencies &
  Omit<RefreshInstitutionIconsDependencies, "endsAt"> & {
    budgetMs?: number;
  };

/**
 * The daily cron: for every Household, guesses the domains and fetches the
 * icons that a run after a push did not finish, retries the failures that
 * are due, and refreshes old icons.
 */
export function makeInstitutionIconsCronHandler(
  dependencies: InstitutionIconsCronDependencies,
) {
  return makeHouseholdCronHandler(dependencies, {
    start: () => ({
      households: 0,
      guessed: 0,
      fetched: 0,
      failed: 0,
      updated: 0,
    }),
    budgetMs: dependencies.budgetMs ?? RUN_BUDGET_MS,
    runHousehold: async (db, householdId, _now, totals, endsAt) => {
      const result = await refreshInstitutionIcons(db, householdId, {
        ...dependencies,
        endsAt,
      });
      totals.households++;
      totals.guessed += result.guessed;
      totals.fetched += result.fetched;
      totals.failed += result.failed;
      totals.updated += result.updated;
    },
    onHouseholdError: (error, totals) => {
      console.error("Institution icons failed for a household", error);
      totals.failed++;
    },
  });
}
