import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { eq } from "drizzle-orm";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { AnchorButton } from "#src/links/anchor-button.tsx";
import { localClock } from "../report/due-report-date.ts";
import {
  readReportSettings,
  type ReportSettings,
} from "../report/read-report-settings.ts";
import { countOpenTodos, readReport } from "../report/read-report.ts";
import { hasCalendarAccount } from "../report/todo-calendar-slots.ts";
import { ReportView } from "./report-view.tsx";

/** What to expect while there is no report. */
export async function NoReportYet({
  scope,
  settings,
  locale,
  headingLevel,
  headingLook = "h3",
}: {
  scope: UserScope;
  settings: ReportSettings;
  locale: SupportedLocale;
  headingLevel: 1 | 2;
  headingLook?: "h3" | "h4";
}) {
  const accounts = await scope.db.$count(
    mailAccounts,
    eq(mailAccounts.userId, scope.userId),
  );
  const clock = localClock(new Date(), settings.timeZone);
  const hour = `${String(settings.digestHour).padStart(2, "0")}:00`;
  return (
    <div css={stack.item}>
      <Heading level={headingLevel} look={headingLook}>
        {t({ en: "Morning report", zh: "晨报" })}
      </Heading>
      <div css={stack.text}>
        <Text as="p" look="body">
          {t({ en: "No report yet", zh: "还没有晨报" })}
        </Text>
        <Text as="p" look="bodySmall" tone="muted">
          {accounts === 0
            ? t({
                en: "Connect a mailbox. Each morning at {hour}, the assistant reads the mail of the last 24 hours and writes down what needs you.",
                zh: "请先连接邮箱。每天早上 {hour}，助手会读取过去 24 小时的邮件，告诉你需要处理什么。",
              }).replace("{hour}", hour)
            : clock.hour >= settings.digestHour
              ? t({
                  en: "Your first morning report comes within the hour.",
                  zh: "第一份晨报会在一小时内送到。",
                })
              : t({
                  en: "Your first morning report comes today at {hour}.",
                  zh: "第一份晨报会在今天 {hour} 送到。",
                }).replace("{hour}", hour)}
        </Text>
      </div>
      {accounts === 0 ? (
        <div>
          <AnchorButton
            href={getLocalePath("/settings/mailboxes", locale)}
            look="primary"
            size="sm"
          >
            {t({ en: "Connect a mailbox", zh: "连接邮箱" })}
          </AnchorButton>
        </div>
      ) : null}
    </div>
  );
}

/** The newest report, or what to expect while there is none. */
export async function LatestReport({
  scope,
  locale,
  headingLevel,
}: {
  scope: UserScope;
  locale: SupportedLocale;
  headingLevel: 1 | 2;
}) {
  const renderedAt = new Date().getTime();
  const [report, settings, openTodos, hasCalendar] = await Promise.all([
    readReport(scope, null),
    readReportSettings(scope),
    countOpenTodos(scope),
    hasCalendarAccount(scope),
  ]);
  if (!report) {
    return (
      <NoReportYet
        scope={scope}
        settings={settings}
        locale={locale}
        headingLevel={headingLevel}
      />
    );
  }
  return (
    <ReportView
      report={report}
      today={localClock(new Date(), settings.timeZone).date}
      timeZone={settings.timeZone}
      openTodos={openTodos}
      locale={locale}
      headingLevel={headingLevel}
      pastLink
      renderedAt={renderedAt}
      hasCalendar={hasCalendar}
    />
  );
}
