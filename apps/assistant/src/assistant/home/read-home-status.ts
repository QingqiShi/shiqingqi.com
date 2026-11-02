import { and, desc, eq, gte } from "drizzle-orm";
import {
  agentRuns,
  mailAccounts,
  morningReports,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import {
  readReportSettings,
  type ReportSettings,
} from "#src/assistant/report/read-report-settings.ts";
import { isRunLive, LONGEST_RUN_MS } from "./is-run-live.ts";
import { nextOrganiseAt } from "./next-organise-at.ts";
import type { HomeRun, HomeStatus } from "./types.ts";

async function readLiveRun(
  { db, userId }: UserScope,
  now: Date,
): Promise<HomeRun | null> {
  const runs = await db
    .select({
      id: agentRuns.id,
      task: agentRuns.task,
      startedAt: agentRuns.startedAt,
      progress: agentRuns.progress,
    })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.userId, userId),
        eq(agentRuns.status, "running"),
        gte(agentRuns.startedAt, new Date(now.getTime() - LONGEST_RUN_MS)),
      ),
    )
    .orderBy(desc(agentRuns.startedAt));
  const live = runs.find((run) =>
    isRunLive(run.task, run.startedAt.getTime(), now.getTime()),
  );
  return live
    ? {
        ...live,
        startedAt: live.startedAt.toISOString(),
        progress: live.progress ?? { inFlight: [], recent: [] },
      }
    : null;
}

async function readSchedule(scope: UserScope) {
  const settings = await readReportSettings(scope);
  const organises =
    settings.organiseEnabled &&
    (await scope.db.$count(
      mailAccounts,
      eq(mailAccounts.userId, scope.userId),
    )) > 0;
  return { organises, settings };
}

async function readUnseenReportDate({ db, userId }: UserScope) {
  const newest = (
    await db
      .select({
        localDate: morningReports.localDate,
        seenAt: morningReports.seenAt,
      })
      .from(morningReports)
      .where(eq(morningReports.userId, userId))
      .orderBy(desc(morningReports.localDate))
      .limit(1)
  ).at(0);
  return newest && newest.seenAt === null ? newest.localDate : null;
}

/** The status, with the settings it read, so that a page does not read them again. */
export async function readHomeStatusAndSettings(
  scope: UserScope,
  now: Date,
): Promise<{ status: HomeStatus; settings: ReportSettings }> {
  const [run, { organises, settings }, unseenReportDate] = await Promise.all([
    readLiveRun(scope, now),
    readSchedule(scope),
    readUnseenReportDate(scope),
  ]);
  return {
    status: {
      serverNow: now.toISOString(),
      run,
      nextOrganiseAt: organises ? nextOrganiseAt(now).toISOString() : null,
      unseenReportDate,
      localDate: localClock(now, settings.timeZone).date,
    },
    settings,
  };
}

/** What the home page shows now and when that changes, from the database alone. */
export async function readHomeStatus(
  scope: UserScope,
  now: Date,
): Promise<HomeStatus> {
  return (await readHomeStatusAndSettings(scope, now)).status;
}
