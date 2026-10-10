import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import { generateWeeklyReports } from "./generate-weekly-reports.ts";

/** The Monday cron: stores last week's Report for every Household. */
export function makeWeeklyReportCronHandler(
  dependencies: HouseholdCronDependencies,
) {
  return makeHouseholdCronHandler(dependencies, {
    start: () => ({ households: 0, written: 0, failed: 0 }),
    runHousehold: async ({ db, householdId }, now, totals) => {
      const result = await generateWeeklyReports(db, householdId, now, "last");
      totals.households++;
      totals.written += result.written;
    },
    onHouseholdError: (error, totals) => {
      console.error("Weekly report failed for a household", error);
      totals.failed++;
    },
  });
}
