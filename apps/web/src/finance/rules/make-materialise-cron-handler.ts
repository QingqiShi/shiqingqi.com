import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import { materialiseRules } from "./materialise-rules.ts";

/** The daily cron: materialises the Rules of every Household. */
export function makeMaterialiseCronHandler(
  dependencies: HouseholdCronDependencies,
) {
  return makeHouseholdCronHandler(dependencies, {
    start: (householdIds) => ({ households: householdIds.length, written: 0 }),
    runHousehold: async (scope, now, totals) => {
      totals.written += (await materialiseRules(scope, now)).written;
    },
  });
}
