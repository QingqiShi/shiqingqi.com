import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Button } from "@tuja/ui/components/button";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import type { UserScope } from "#src/assistant/db/types.ts";
import { getCalendarDeps } from "../home/get-calendar-deps.ts";
import { lateReport } from "../home/late-report.ts";
import {
  readReportAgenda,
  readTodayAgenda,
} from "../home/read-today-agenda.ts";
import { readMailboxHealth } from "../mailboxes/read-mailbox-health.ts";
import { localClock } from "../report/due-report-date.ts";
import type { ReportSettings } from "../report/read-report-settings.ts";
import { listOpenTodos, readNewestReportItem } from "../report/read-report.ts";
import { hasCalendarAccount } from "../report/todo-calendar-slots.ts";
import { DayHead } from "../report-page/day-head.tsx";
import { formatDay } from "../report-page/format-day.ts";
import { NoReportYet } from "../report-page/latest-report.tsx";
import { DayTodoGroups } from "../report-page/open-todo-groups.tsx";
import { reportColumns } from "../report-page/report-columns.stylex.ts";
import { ReportSection } from "../report-page/report-section.tsx";
import { toTodoItemData } from "../report-page/to-todo-item-data.ts";
import { TodoSelectionArea } from "../report-page/todo-selection-area.tsx";
import { TodoStoreProvider } from "../report-page/todo-store-provider.tsx";
import { getDateLocale } from "../shell/get-date-locale.ts";
import { HomeStatusLine } from "./home-status-provider.tsx";
import { HomeViewSwitch } from "./home-view-switch.tsx";
import { LateReportNote } from "./late-report-note.tsx";
import { ReconnectCallout } from "./reconnect-callout.tsx";
import { TodayCalendar, TodayCalendarFallback } from "./today-calendar.tsx";

/** The home page's Plan view, at `?view=plan`: today's to-dos and calendar, under the day. */
export async function TodayView({
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
  const today = localClock(now, settings.timeZone).date;
  const dateLocale = await getDateLocale(locale);
  const agenda = readTodayAgenda(
    scope,
    now,
    getCalendarDeps(),
    settings.timeZone,
  );
  const reportAgenda = agenda.then((live) =>
    live.status === "error" ? readReportAgenda(scope, today) : null,
  );
  const [open, newest, hasCalendar, mailboxes] = await Promise.all([
    listOpenTodos(scope),
    readNewestReportItem(scope),
    hasCalendarAccount(scope),
    readMailboxHealth(scope),
  ]);
  const late = lateReport({
    now,
    timeZone: settings.timeZone,
    reportHour: settings.digestHour,
    newestReportDate: newest?.localDate ?? null,
    reportRunning,
    hasMailbox: mailboxes.connected > 0,
  });
  return (
    <TodoStoreProvider
      todos={open.map((todo) => toTodoItemData(todo))}
      today={today}
      timeZone={settings.timeZone}
      openCount={open.length}
      hasCalendar={hasCalendar}
      renderedAt={now.getTime()}
    >
      <div css={[stack.group, styles.today, typeModifier.verbatim]}>
        <header css={stack.item}>
          <DayHead
            date={formatDay(today, dateLocale)}
            dateIsTitle
            locale={locale}
            pastLink={newest === null ? false : "narrow"}
            status={<HomeStatusLine />}
            note={
              late ? (
                <LateReportNote
                  late={late}
                  today={today}
                  dateLocale={dateLocale}
                />
              ) : null
            }
            controls={newest ? <HomeViewSwitch view="today" /> : null}
          />
        </header>
        <ReconnectCallout health={mailboxes} />
        {newest ? null : (
          <NoReportYet
            scope={scope}
            settings={settings}
            locale={locale}
            headingLevel={2}
          />
        )}
        <div css={[reportColumns.base, styles.columns]}>
          <ReportSection
            headingLevel={2}
            title={t({ en: "To-dos", zh: "待办" })}
            action={
              <Button
                href={getLocalePath("/todos", locale)}
                look="ghost"
                size="sm"
                bleed="end"
              >
                {t({ en: "See all", zh: "查看全部" })}
              </Button>
            }
          >
            <div css={stack.item}>
              <TodoSelectionArea canAdd={false} canSearch={false}>
                <DayTodoGroups headingLevel={3} />
              </TodoSelectionArea>
            </div>
          </ReportSection>
          <ReportSection
            headingLevel={2}
            title={t({ en: "Calendar", zh: "日程" })}
          >
            <Suspense fallback={<TodayCalendarFallback />}>
              <TodayCalendar
                agenda={agenda}
                reportAgenda={reportAgenda}
                locale={locale}
              />
            </Suspense>
          </ReportSection>
        </div>
      </div>
    </TodoStoreProvider>
  );
}

const styles = stylex.create({
  today: {
    containerType: "inline-size",
  },
  columns: {
    gap: rhythm.group,
  },
});
