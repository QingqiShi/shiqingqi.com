import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { UserScope } from "#src/assistant/db/types.ts";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { localClock } from "../report/due-report-date.ts";
import type { ReportSettings } from "../report/read-report-settings.ts";
import { countOpenTodos, readReport } from "../report/read-report.ts";
import { hasCalendarAccount } from "../report/todo-calendar-slots.ts";
import { NoReportYet } from "../report-page/latest-report.tsx";
import { ReportView } from "../report-page/report-view.tsx";
import { MarkReportSeen } from "./mark-report-seen.tsx";

/** The home page until the newest report is seen: that report, and the way on. */
export async function HomeReport({
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
  const [report, openTodos, hasCalendar] = await Promise.all([
    readReport(scope, null),
    countOpenTodos(scope),
    hasCalendarAccount(scope),
  ]);
  if (!report) {
    return (
      <NoReportYet
        scope={scope}
        settings={settings}
        locale={locale}
        headingLevel={1}
      />
    );
  }
  return (
    <div css={stack.group}>
      <ReportView
        report={report}
        today={localClock(now, settings.timeZone).date}
        timeZone={settings.timeZone}
        openTodos={openTodos}
        locale={locale}
        headingLevel={1}
        pastLink="list"
        renderedAt={now.getTime()}
        refreshesOnLeave
        hasCalendar={hasCalendar}
      />
      <MarkReportSeen key={report.id} reportId={report.id} />
      <div>
        <AnchorButton
          href={getLocalePath("/", locale)}
          look="outline"
          icon={<ArrowRightIcon weight="bold" />}
        >
          {t({ en: "On to to-dos and calendar", zh: "去看待办和日程" })}
        </AnchorButton>
      </div>
    </div>
  );
}
