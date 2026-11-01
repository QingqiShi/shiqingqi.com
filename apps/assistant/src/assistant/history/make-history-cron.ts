import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import { importHistory, type HistoryImportDeps } from "./import-history.ts";

/** A run starts no new batch of mail after this; the function may run 300 s. */
export const HISTORY_IMPORT_BUDGET_MS = 240_000;

interface HistoryTotals {
  users: number;
  failedUsers: number;
  stored: number;
  queued: number;
  submitted: number;
  classified: number;
  failed: number;
}

/** The cron of history import: one checkpointed run for every user within one time budget. */
export function makeHistoryCron(
  dependencies: UserCronDependencies & {
    getHistoryDeps: () => HistoryImportDeps | null;
  },
) {
  return makeUserCronHandler<HistoryTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getHistoryDeps() !== null,
    },
    {
      budgetMs: HISTORY_IMPORT_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        failedUsers: 0,
        stored: 0,
        queued: 0,
        submitted: 0,
        classified: 0,
        failed: 0,
      }),
      runUser: async ({ db, userId, totals, endsAt }) => {
        const deps = dependencies.getHistoryDeps();
        if (!deps) return;
        const result = await importHistory({ db, userId, endsAt }, deps);
        totals.stored += result.stored;
        totals.queued += result.queued;
        totals.submitted += result.submitted;
        totals.classified += result.classified;
        totals.failed += result.failed;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
