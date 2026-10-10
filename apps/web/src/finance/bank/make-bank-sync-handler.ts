import type { LanguageModel } from "ai";
import type { RepositoryScope } from "../db/repositories/types.ts";
import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import type { BankConnection } from "./types.ts";

interface BankSyncCronDependencies extends HouseholdCronDependencies {
  getBankClient: (scope: RepositoryScope, now: Date) => Promise<BankConnection>;
  getModel: () => LanguageModel | null;
}

/**
 * A link synced or tried less than this long ago is left out of the cron run:
 * Lunch Flow reads the bank about once a day, and the bank allows only a few
 * pulls per account a day.
 */
const CRON_MIN_GAP_MS = 5 * 60 * 60 * 1000;

/** The six-hourly cron: syncs the Bank links of every connected Household. */
export function makeBankSyncHandler(dependencies: BankSyncCronDependencies) {
  return makeHouseholdCronHandler(dependencies, {
    start: () => ({ households: 0, links: 0, failed: 0, created: 0 }),
    runHousehold: async (scope, now, totals) => {
      const connection = await dependencies.getBankClient(scope, now);
      if (connection.status !== "connected") return;
      const results = await syncBankLinks({
        db: scope.db,
        householdId: scope.householdId,
        client: connection.client,
        model: dependencies.getModel(),
        now,
        skipSyncedAfter: new Date(now.getTime() - CRON_MIN_GAP_MS),
      });
      totals.households++;
      totals.links += results.length;
      totals.failed += results.filter((result) => result.error).length;
      totals.created += results.reduce(
        (sum, result) => sum + result.created,
        0,
      );
    },
    onHouseholdError: (error, totals) => {
      console.error("Bank sync failed for a household", error);
      totals.failed++;
    },
  });
}
