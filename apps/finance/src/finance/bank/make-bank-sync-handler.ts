import type { LabellingModel } from "../ai/label-bank-rows.ts";
import { bankLinkRepository } from "../db/repositories/bank-link-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import {
  makeHouseholdCronHandler,
  type HouseholdCronDependencies,
} from "../http/make-household-cron-handler.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import type { BankConnection } from "./types.ts";

interface BankSyncCronDependencies extends HouseholdCronDependencies {
  getBankClient: (
    db: FinanceDb,
    householdId: string,
    now: Date,
  ) => Promise<BankConnection>;
  getModel: () => LabellingModel | null;
}

/**
 * A link synced or tried less than this long ago is left out of the cron run:
 * Lunch Flow reads the bank about once a day, and the bank allows only a few
 * pulls per account a day.
 */
const CRON_MIN_GAP_MS = 5 * 60 * 60 * 1000;

/** The six-hourly cron: syncs the Bank links of every connected Household, then labels their new bank rows. */
export function makeBankSyncHandler(dependencies: BankSyncCronDependencies) {
  return makeHouseholdCronHandler(dependencies, {
    start: () => ({ households: 0, links: 0, failed: 0, created: 0 }),
    runHousehold: async (db, householdId, now, totals) => {
      const connection = await dependencies.getBankClient(db, householdId, now);
      if (connection.status !== "connected") {
        if (connection.keyUnreadable) {
          const connectionId = await withHousehold(db, householdId, (read) =>
            bankLinkRepository.findConnectionId(read),
          );
          console.warn(
            "Bank sync skipped a household: its stored Lunch Flow key does not open with FINANCE_CREDENTIAL_KEY",
            { householdId, connectionId },
          );
        }
        return;
      }
      const results = await syncBankLinks({
        db,
        householdId,
        client: connection.client,
        now,
        skipSyncedAfter: new Date(now.getTime() - CRON_MIN_GAP_MS),
      });
      const processed = await processBankRows({
        db,
        householdId,
        model: dependencies.getModel(),
        now,
        clock: dependencies.now,
      });
      totals.households++;
      totals.links += results.length;
      totals.failed += results.filter((result) => result.error).length;
      for (const count of processed.createdByAccount.values()) {
        totals.created += count;
      }
    },
    onHouseholdError: (error, totals) => {
      console.error("Bank sync failed for a household", error);
      totals.failed++;
    },
  });
}
