import { listHouseholdIds } from "../db/list-household-ids.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "./finance-json.ts";
import { isCronAuthorised } from "./is-cron-authorised.ts";

export interface HouseholdCronDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  /** Defaults to `CRON_SECRET`. */
  getCronSecret?: () => string | undefined;
  now: () => Date;
}

interface HouseholdCronJob<Totals> {
  /** The totals before the first Household. */
  start: (householdIds: readonly string[]) => Totals;
  runHousehold: (
    scope: RepositoryScope,
    now: Date,
    totals: Totals,
  ) => Promise<void>;
  /** When set, a Household that fails is counted here and the run goes on; else the run stops. */
  onHouseholdError?: (error: unknown, totals: Totals) => void;
}

/**
 * A Vercel Cron handler that runs `job` for every Household and sends its
 * totals. It needs the cron secret and a database.
 */
export function makeHouseholdCronHandler<Totals>(
  dependencies: HouseholdCronDependencies,
  job: HouseholdCronJob<Totals>,
) {
  const getCronSecret =
    dependencies.getCronSecret ?? (() => process.env.CRON_SECRET);
  return async function GET(request: Request) {
    if (!isCronAuthorised(request, getCronSecret())) {
      return financeJson({ error: "unauthorised" }, { status: 401 });
    }
    if (!dependencies.isConfigured()) {
      return financeJson({ error: "not-configured" }, { status: 503 });
    }
    const db = dependencies.getDb();
    const now = dependencies.now();
    const householdIds = await listHouseholdIds(db);
    const totals = job.start(householdIds);
    for (const householdId of householdIds) {
      try {
        await job.runHousehold({ db, householdId }, now, totals);
      } catch (error) {
        if (!job.onHouseholdError) throw error;
        job.onHouseholdError(error, totals);
      }
    }
    return financeJson(totals);
  };
}
