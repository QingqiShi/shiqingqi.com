import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import type { OrganiseDeps } from "./organise-account.ts";
import { organiseUserMail } from "./organise-user-mail.ts";

/** A run starts no new page after this; the function may run 300 s. */
export const ORGANISE_BUDGET_MS = 240_000;

interface OrganiseTotals {
  users: number;
  usersOff: number;
  failedUsers: number;
  accounts: number;
  failedAccounts: number;
  moved: number;
  createdFolders: number;
  left: number;
  remaining: number;
}

/** The 15-minute cron: files the inbox mail of every user who turned organising on. */
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
        moved: 0,
        createdFolders: 0,
        left: 0,
        remaining: 0,
      }),
      runUser: async ({ db, userId, totals, endsAt }) => {
        const deps = dependencies.getOrganiseDeps();
        if (!deps) return;
        const result = await organiseUserMail({ db, userId, endsAt }, deps);
        if (!result.enabled) totals.usersOff += 1;
        totals.accounts += result.accounts;
        totals.failedAccounts += result.failedAccounts;
        totals.moved += result.moved;
        totals.createdFolders += result.createdFolders;
        totals.left += result.left;
        totals.remaining += result.remaining;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
