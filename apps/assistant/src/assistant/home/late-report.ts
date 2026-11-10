import {
  dueReportDate,
  LAST_TRY_HOUR,
  localClock,
} from "#src/assistant/report/due-report-date.ts";

/**
 * Whether today's report is late, and the local hour of its next try: null
 * while it is not due yet, is there, or is being written now, and for a user
 * with no mailbox, who gets no report. The cron tries each hour on the hour.
 */
export function lateReport({
  now,
  timeZone,
  reportHour,
  newestReportDate,
  reportRunning,
  hasMailbox,
}: {
  now: Date;
  timeZone: string;
  reportHour: number;
  newestReportDate: string | null;
  reportRunning: boolean;
  hasMailbox: boolean;
}): { nextTryHour: number | null } | null {
  if (reportRunning || !hasMailbox || newestReportDate === null) return null;
  const due = dueReportDate({
    now,
    timeZone,
    reportHour,
    latestReportDate: newestReportDate,
  });
  if (due === null) return null;
  const nextHour = localClock(now, timeZone).hour + 1;
  return { nextTryHour: nextHour <= LAST_TRY_HOUR ? nextHour : null };
}
