import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import { syncUserMail, type SyncUserMailDeps } from "./sync-user-mail.ts";

/** A run starts no new batch after this; the function may run 300 s. */
export const MAIL_SYNC_BUDGET_MS = 240_000;

interface MailSyncTotals {
  users: number;
  accounts: number;
  failedAccounts: number;
  failedUsers: number;
  newMessages: number;
}

/** The 15-minute cron: syncs every user's accounts within one time budget. */
export function makeMailSyncCron(
  dependencies: UserCronDependencies & {
    getMailDeps: () => SyncUserMailDeps | null;
  },
) {
  return makeUserCronHandler<MailSyncTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getMailDeps() !== null,
    },
    {
      budgetMs: MAIL_SYNC_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        accounts: 0,
        failedAccounts: 0,
        failedUsers: 0,
        newMessages: 0,
      }),
      runUser: async ({ db, userId, totals, endsAt }) => {
        const deps = dependencies.getMailDeps();
        if (!deps) return;
        const result = await syncUserMail(
          { db, userId, endsAt, now: dependencies.now },
          deps,
        );
        totals.accounts += result.accounts;
        totals.failedAccounts += result.failed;
        totals.newMessages += result.newMessages;
      },
      onUserError: (_error, _userId, totals) => {
        totals.failedUsers += 1;
      },
    },
  );
}
