import {
  makeUserCronHandler,
  type UserCronDependencies,
} from "#src/assistant/http/make-user-cron-handler.ts";
import type { PushSender } from "#src/assistant/push/get-push-sender.ts";
import {
  buildMorningReport,
  type ReportBuildDeps,
} from "./build-morning-report.ts";
import { notifyReport } from "./notify-report.ts";

/**
 * The report agent submits by this time. Its last step can take 45 s more,
 * then the report is stored and the mail marked read; the function may run
 * 300 s.
 */
export const MORNING_REPORT_BUDGET_MS = 180_000;

interface MorningReportCronTotals {
  users: number;
  built: number;
  /** Reports that could not be written yet; the next hour tries again. */
  retrying: number;
  notWritten: number;
  pushed: number;
  removedDevices: number;
  failedUsers: number;
}

/**
 * The hourly cron: builds the morning report of each user whose report
 * hour has come in their time zone, and sends its headline to their
 * devices.
 */
export function makeMorningReportCron(
  dependencies: UserCronDependencies & {
    /** Null when the credential key is missing: then no mailbox can be read. */
    getBuildDeps: () => ReportBuildDeps | null;
    /** Null when the VAPID keys are not set: then the report is built but not pushed. */
    getPushSender: () => PushSender | null;
  },
) {
  return makeUserCronHandler<MorningReportCronTotals>(
    {
      ...dependencies,
      isConfigured: () =>
        dependencies.isConfigured() && dependencies.getBuildDeps() !== null,
    },
    {
      budgetMs: MORNING_REPORT_BUDGET_MS,
      start: (userIds) => ({
        users: userIds.length,
        built: 0,
        retrying: 0,
        notWritten: 0,
        pushed: 0,
        removedDevices: 0,
        failedUsers: 0,
      }),
      runUser: async ({ db, userId, totals, endsAt }) => {
        const deps = dependencies.getBuildDeps();
        if (!deps) return;
        const report = await buildMorningReport({ db, userId, endsAt }, deps);
        if (!report) return;
        if (report === "retry") {
          totals.retrying += 1;
          return;
        }
        totals.built += 1;
        if (report.status === "no-model" || report.status === "failed") {
          totals.notWritten += 1;
        }
        const send = dependencies.getPushSender();
        if (!send) return;
        const pushed = await notifyReport({ db, userId }, report, {
          send,
          now: deps.now,
        });
        totals.pushed += pushed.sent;
        totals.removedDevices += pushed.removed;
      },
      onUserError: (error, userId, totals) => {
        console.error(
          "Morning report failed",
          userId,
          error instanceof Error ? error.message : error,
        );
        totals.failedUsers += 1;
      },
    },
  );
}
