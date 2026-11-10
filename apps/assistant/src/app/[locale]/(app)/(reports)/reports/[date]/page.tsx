import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { homeViewHref } from "#src/assistant/home/choose-home-view.ts";
import { MarkReportSeen } from "#src/assistant/home-page/mark-report-seen.tsx";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  listReports,
  readReport,
} from "#src/assistant/report/read-report.ts";
import { hasCalendarAccount } from "#src/assistant/report/todo-calendar-slots.ts";
import { formatDay } from "#src/assistant/report-page/format-day.ts";
import { ReportView } from "#src/assistant/report-page/report-view.tsx";
import { getDateLocale } from "#src/assistant/shell/get-date-locale.ts";

interface Props {
  params: Promise<{ locale: string; date: string }>;
}

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, date } = await params;
  const valid = validateLocale(locale);
  return {
    title: LOCAL_DATE.test(date)
      ? formatDay(date, await getDateLocale(valid))
      : t({ en: "Morning report", zh: "晨报" }),
  };
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale, date } = await params;
  const locale = validateLocale(rawLocale);
  if (!LOCAL_DATE.test(date)) notFound();
  const session = await requirePageSession(locale, `/reports/${date}`);
  const scope = { db: getAssistantDb(), userId: session.userId };
  const renderedAt = new Date().getTime();
  const [report, reports, settings, openTodos, hasCalendar] = await Promise.all(
    [
      readReport(scope, date),
      listReports(scope),
      readReportSettings(scope),
      countOpenTodos(scope),
      hasCalendarAccount(scope),
    ],
  );
  if (!report) notFound();
  if (reports.at(0)?.localDate === date)
    redirect(homeViewHref("report", locale));
  return (
    <>
      <ReportView
        report={report}
        today={localClock(new Date(), settings.timeZone).date}
        timeZone={settings.timeZone}
        openTodos={openTodos}
        locale={locale}
        dateLocale={await getDateLocale(locale)}
        headingLevel={1}
        renderedAt={renderedAt}
        hasCalendar={hasCalendar}
      />
      {report.seenAt === null ? <MarkReportSeen reportId={report.id} /> : null}
    </>
  );
}
