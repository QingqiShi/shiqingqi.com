import { listHouseholdIds } from "../db/list-household-ids.ts";
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

const DAY_MS = 24 * 60 * 60 * 1000;

interface HouseholdCronJob<Totals> {
  /** The totals before the first Household. */
  start: (householdIds: readonly string[]) => Totals;
  /** `endsAt` is the epoch milliseconds, by `now`, after which the job starts no new work. */
  runHousehold: (
    db: FinanceDb,
    householdId: string,
    now: Date,
    totals: Totals,
    endsAt: number,
  ) => Promise<void>;
  /**
   * When set, the run starts no Household after this many milliseconds, and
   * each day it starts at the next Household, so that the Households a run
   * leaves out are not always the same ones.
   */
  budgetMs?: number;
  /** When set, a Household that fails is counted here and the run goes on; else the run stops. */
  onHouseholdError?: (error: unknown, totals: Totals) => void;
}

function rotatedForDay(householdIds: readonly string[], now: Date) {
  if (householdIds.length === 0) return householdIds;
  const first = Math.floor(now.getTime() / DAY_MS) % householdIds.length;
  return [...householdIds.slice(first), ...householdIds.slice(0, first)];
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
    const endsAt =
      job.budgetMs === undefined ? Infinity : now.getTime() + job.budgetMs;
    const householdIds = await listHouseholdIds(db);
    const totals = job.start(householdIds);
    const ordered =
      job.budgetMs === undefined
        ? householdIds
        : rotatedForDay(householdIds, now);
    for (const householdId of ordered) {
      if (dependencies.now().getTime() >= endsAt) break;
      try {
        await job.runHousehold(db, householdId, now, totals, endsAt);
      } catch (error) {
        if (!job.onHouseholdError) throw error;
        job.onHouseholdError(error, totals);
      }
    }
    return financeJson(totals);
  };
}
