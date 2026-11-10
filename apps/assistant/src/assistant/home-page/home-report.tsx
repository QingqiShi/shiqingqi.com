import type { SupportedLocale } from "@tuja/i18n/types";
import type { UserScope } from "#src/assistant/db/types.ts";
import { lateReport } from "../home/late-report.ts";
import { readMailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import { localClock } from "../report/due-report-date.ts";
import type { ReportSettings } from "../report/read-report-settings.ts";
import { countOpenTodos, readReport } from "../report/read-report.ts";
import { hasCalendarAccount } from "../report/todo-calendar-slots.ts";
import { DayHead } from "../report-page/day-head.tsx";
import { formatDay } from "../report-page/format-day.ts";
import { NoReportYet } from "../report-page/latest-report.tsx";
import { ReportView } from "../report-page/report-view.tsx";
import { HomeReportMark } from "../report-page/reports-frame.tsx";
import { getDateLocale } from "../shell/get-date-locale.ts";
import { HomeStatusLine } from "./home-status-provider.tsx";
import { HomeViewSwitch } from "./home-view-switch.tsx";
import { LateReportNote } from "./late-report-note.tsx";
import { MarkReportSeen } from "./mark-report-seen.tsx";
import { ReconnectCallout } from "./reconnect-callout.tsx";

/** The home page's Report view, at `?view=report`: the newest report. */
export async function HomeReport({
  scope,
  locale,
  now,
  settings,
  reportRunning,
}: {
  scope: UserScope;
  locale: SupportedLocale;
  now: Date;
  settings: ReportSettings;
  /** A run writes today's report now. */
  reportRunning: boolean;
}) {
  const [report, openTodos, hasCalendar, mailboxes] = await Promise.all([
    readReport(scope, null),
    countOpenTodos(scope),
    hasCalendarAccount(scope),
    readMailboxHealth(scope),
  ]);
  const today = localClock(now, settings.timeZone).date;
  const dateLocale = await getDateLocale(locale);
  if (!report) {
    return (
      <>
        <header>
          <DayHead
            date={formatDay(today, dateLocale)}
            locale={locale}
            status={<HomeStatusLine />}
            controls={<HomeViewSwitch view="report" />}
          />
        </header>
        <ReconnectCallout health={mailboxes} />
        <NoReportYet
          scope={scope}
          settings={settings}
          locale={locale}
          headingLevel={1}
        />
      </>
    );
  }
  const late = lateReport({
    now,
    timeZone: settings.timeZone,
    reportHour: settings.digestHour,
    newestReportDate: report.localDate,
    reportRunning,
    hasMailbox: mailboxes.connected > 0,
  });
  return (
    <>
      <ReportView
        report={report}
        today={today}
        timeZone={settings.timeZone}
        openTodos={openTodos}
        locale={locale}
        dateLocale={dateLocale}
        headingLevel={1}
        pastLink
        renderedAt={now.getTime()}
        refreshesOnLeave
        hasCalendar={hasCalendar}
        status={<HomeStatusLine />}
        note={
          late ? (
            <LateReportNote
              late={late}
              shownDate={report.localDate}
              today={today}
              dateLocale={dateLocale}
            />
          ) : null
        }
        mailboxHealth={mailboxes}
        controls={<HomeViewSwitch view="report" />}
      />
      <MarkReportSeen key={report.id} reportId={report.id} />
      <HomeReportMark date={report.localDate} />
    </>
  );
}
