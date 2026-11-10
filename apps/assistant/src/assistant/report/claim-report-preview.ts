import { lte, ne, or } from "drizzle-orm";
import { morningReportPreviews } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import {
  readRecentReports,
  type RecentReport,
} from "./build-morning-report.ts";
import { nextReportDate } from "./due-report-date.ts";
import type { TimeBounds } from "./local-day-bounds.ts";
import { REPORT_PREVIEW_STALE_MS } from "./read-report-preview.ts";
import {
  readReportSettings,
  type ReportSettings,
} from "./read-report-settings.ts";

const WINDOW_MS = 24 * 60 * 60 * 1000;

/** A preview that this caller has the sole right to run. */
export interface ClaimedReportPreview {
  startedAt: Date;
  localDate: string;
  mailWindow: TimeBounds;
  settings: ReportSettings;
  recentReports: readonly RecentReport[];
}

/**
 * Marks the user's preview row as a new running preview, or returns null
 * when one is running. The last built preview stays in the row. A running row of `REPORT_PREVIEW_STALE_MS` or
 * older does not count: its function is gone.
 */
export async function claimReportPreview(
  scope: UserScope,
  now: Date,
): Promise<ClaimedReportPreview | null> {
  const [settings, recentReports] = await Promise.all([
    readReportSettings(scope),
    readRecentReports(scope),
  ]);
  const localDate = nextReportDate({
    now,
    timeZone: settings.timeZone,
    reportHour: settings.digestHour,
    latestReportDate: recentReports.at(0)?.localDate ?? null,
  });
  const mailWindow = {
    start: new Date(now.getTime() - WINDOW_MS),
    end: now,
  };
  const values = {
    status: "running" as const,
    error: null,
    startedAt: now,
  };
  const claimed = await scope.db
    .insert(morningReportPreviews)
    .values({ userId: scope.userId, localDate, ...values })
    .onConflictDoUpdate({
      target: morningReportPreviews.userId,
      // The last built preview, with its day, stays until a new one is built, so that a failed run can show it below the failure.
      set: values,
      setWhere: or(
        ne(morningReportPreviews.status, "running"),
        lte(
          morningReportPreviews.startedAt,
          new Date(now.getTime() - REPORT_PREVIEW_STALE_MS),
        ),
      ),
    })
    .returning({ userId: morningReportPreviews.userId });
  return claimed.length > 0
    ? { startedAt: now, localDate, mailWindow, settings, recentReports }
    : null;
}
