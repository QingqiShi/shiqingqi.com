import { t } from "@tuja/i18n";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  readReport,
} from "#src/assistant/report/read-report.ts";
import { formatDay } from "#src/assistant/report-page/format-day.ts";
import { ReportView } from "#src/assistant/report-page/report-view.tsx";

interface Props {
  params: Promise<{ locale: string; date: string }>;
}

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, date } = await params;
  const valid = validateLocale(locale);
  return {
    title: LOCAL_DATE.test(date)
      ? formatDay(date, valid)
      : t({ en: "Morning report", zh: "晨报" }),
  };
}

export default async function Page({ params }: Props) {
  const { locale: rawLocale, date } = await params;
  const locale = validateLocale(rawLocale);
  if (!LOCAL_DATE.test(date)) notFound();
  const session = await requirePageSession(locale, `/reports/${date}`);
  const scope = { db: getAssistantDb(), userId: session.userId };
  const [report, settings, openTodos] = await Promise.all([
    readReport(scope, date),
    readReportSettings(scope),
    countOpenTodos(scope),
  ]);
  if (!report) notFound();
  return (
    <ReportView
      report={report}
      today={localClock(new Date(), settings.timeZone).date}
      openTodos={openTodos}
      locale={locale}
    />
  );
}
