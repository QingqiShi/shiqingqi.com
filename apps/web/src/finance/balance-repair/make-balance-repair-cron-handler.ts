import type { BalanceDrift } from "../db/repositories/balance-check-repository.ts";
import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import { repairBalanceDays } from "./repair-balance-days.ts";

interface BalanceRepairCronDependencies extends HouseholdCronDependencies {
  /** Defaults to an error log: a drift is a bug in a write that did not work out its balances again. */
  onDrift?: (householdId: string, drift: BalanceDrift) => void;
}

function logDrift(householdId: string, drift: BalanceDrift) {
  console.error("Finance stored balances drifted", { householdId, ...drift });
}

/** The daily cron: checks the queued account days of every Household and repairs the wrong ones. */
export function makeBalanceRepairCronHandler(
  dependencies: BalanceRepairCronDependencies,
) {
  const onDrift = dependencies.onDrift ?? logDrift;
  return makeHouseholdCronHandler(dependencies, {
    start: () => ({ households: 0, checked: 0, drifts: 0, failed: 0 }),
    runHousehold: async (db, householdId, now, totals) => {
      const result = await repairBalanceDays(db, householdId, now, (drift) => {
        onDrift(householdId, drift);
      });
      totals.households++;
      totals.checked += result.checked;
      totals.drifts += result.drifts;
    },
    onHouseholdError: (error, totals) => {
      console.error("Balance repair failed for a household", error);
      totals.failed++;
    },
  });
}
