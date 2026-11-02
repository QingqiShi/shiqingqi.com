import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import { organiseUserMail, type OrganiseDeps } from "./organise-user-mail.ts";

/** The agent starts no new step after this; the function may run 300 s. */
export const ORGANISE_BUDGET_MS = 240_000;

interface OrganiseTotals {
  users: number;
  usersOff: number;
  failedUsers: number;
  accounts: number;
  failedAccounts: number;
  inboxMail: number;
  runs: number;
  stoppedRuns: number;
  failedRuns: number;
  moved: number;
  createdFolders: number;
  renamedFolders: number;
  deletedFolders: number;
  flagged: number;
  calendarChanges: number;
}

/** The 15-minute cron: runs the organise agent for every user who turned organising on. */
export function makeOrganiseCron(
  dependencies: UserCronDependencies & {
    getOrganiseDeps: () => OrganiseDeps | null;
  },
) {
  return makeUserCronHandler<OrganiseTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getOrganiseDeps() !== null,
    },
    {
      budgetMs: ORGANISE_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        usersOff: 0,
        failedUsers: 0,
        accounts: 0,
        failedAccounts: 0,
        inboxMail: 0,
        runs: 0,
        stoppedRuns: 0,
        failedRuns: 0,
        moved: 0,
        createdFolders: 0,
        renamedFolders: 0,
        deletedFolders: 0,
        flagged: 0,
        calendarChanges: 0,
      }),
      runUser: async ({ db, userId, totals, endsAt }) => {
        const deps = dependencies.getOrganiseDeps();
        if (!deps) return;
        const result = await organiseUserMail({ db, userId, endsAt }, deps);
        if (!result.enabled) totals.usersOff += 1;
        totals.accounts += result.accounts;
        totals.failedAccounts += result.failedAccounts;
        totals.inboxMail += result.inboxMail;
        if (result.run) {
          totals.runs += 1;
          if (result.run.status === "stopped") totals.stoppedRuns += 1;
          if (result.run.status === "failed") totals.failedRuns += 1;
        }
        totals.moved += result.moved;
        totals.createdFolders += result.createdFolders;
        totals.renamedFolders += result.renamedFolders;
        totals.deletedFolders += result.deletedFolders;
        totals.flagged += result.flagged;
        totals.calendarChanges +=
          result.createdEvents + result.updatedEvents + result.deletedEvents;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
