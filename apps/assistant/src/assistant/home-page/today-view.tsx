import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import type { UserScope } from "#src/assistant/db/types.ts";
import { getCalendarDeps } from "../home/get-calendar-deps.ts";
import { readTodayAgenda } from "../home/read-today-agenda.ts";
import { localClock } from "../report/due-report-date.ts";
import type { ReportSettings } from "../report/read-report-settings.ts";
import { listOpenTodos, readNewestReportItem } from "../report/read-report.ts";
import { hasCalendarAccount } from "../report/todo-calendar-slots.ts";
import { formatDay } from "../report-page/format-day.ts";
import { NoReportYet } from "../report-page/latest-report.tsx";
import { OpenTodoGroups } from "../report-page/open-todo-groups.tsx";
import { reportColumns } from "../report-page/report-columns.stylex.ts";
import { ReportSection } from "../report-page/report-section.tsx";
import { toTodoItemData } from "../report-page/to-todo-item-data.ts";
import { TodoSelectionArea } from "../report-page/todo-selection-area.tsx";
import { TodoStoreProvider } from "../report-page/todo-store-provider.tsx";
import { NewestReportLink } from "./newest-report-link.tsx";
import { TodayCalendar, TodayCalendarFallback } from "./today-calendar.tsx";

/** The home page once the newest report is seen: open to-dos and today's calendar. */
export async function TodayView({
  scope,
  locale,
  now,
  settings,
}: {
  scope: UserScope;
  locale: SupportedLocale;
  now: Date;
  settings: ReportSettings;
}) {
  const agenda = readTodayAgenda(
    scope,
    now,
    getCalendarDeps(),
    settings.timeZone,
  );
  const [open, newest, hasCalendar] = await Promise.all([
    listOpenTodos(scope),
    readNewestReportItem(scope),
    hasCalendarAccount(scope),
  ]);
  const today = localClock(now, settings.timeZone).date;
  return (
    <TodoStoreProvider
      todos={open.map((todo) => toTodoItemData(todo))}
      today={today}
      timeZone={settings.timeZone}
      locale={locale}
      openCount={open.length}
      hasCalendar={hasCalendar}
      renderedAt={now.getTime()}
    >
      <div css={[stack.group, styles.today]}>
        <header css={stack.text}>
          <Heading level={1} look="h3">
            {t({ en: "Today", zh: "今天" })}
          </Heading>
          <Text as="p" look="bodySmall" tone="muted">
            {formatDay(today, locale)}
          </Text>
        </header>
        {newest ? (
          <NewestReportLink report={newest} />
        ) : (
          <NoReportYet
            scope={scope}
            settings={settings}
            locale={locale}
            headingLevel={2}
            headingLook="h4"
          />
        )}
        <div css={[reportColumns.base, styles.columns]}>
          <ReportSection
            headingLevel={2}
            title={t({ en: "To-dos", zh: "待办" })}
          >
            <div css={stack.item}>
              <TodoSelectionArea canAdd canSearch={false}>
                <OpenTodoGroups headingLevel={3} />
              </TodoSelectionArea>
            </div>
          </ReportSection>
          <ReportSection
            headingLevel={2}
            title={t({ en: "Calendar", zh: "日程" })}
          >
            <Suspense fallback={<TodayCalendarFallback />}>
              <TodayCalendar agenda={agenda} />
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
