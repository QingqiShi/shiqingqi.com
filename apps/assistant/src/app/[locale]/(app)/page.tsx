import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { mailAccounts } from "#src/assistant/db/schema.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  readReport,
} from "#src/assistant/report/read-report.ts";
import { ReportView } from "#src/assistant/report-page/report-view.tsx";
import { AnchorButton } from "#src/links/anchor-button.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Morning report", zh: "晨报" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const [accounts, report, settings, openTodos] = await Promise.all([
    scope.db.$count(mailAccounts, eq(mailAccounts.userId, scope.userId)),
    readReport(scope, null),
    readReportSettings(scope),
    countOpenTodos(scope),
  ]);
  const clock = localClock(new Date(), settings.timeZone);
  if (report) {
    return (
      <ReportView
        report={report}
        today={clock.date}
        openTodos={openTodos}
        locale={locale}
      />
    );
  }

  const hour = `${String(settings.digestHour).padStart(2, "0")}:00`;
  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "No report yet", zh: "还没有晨报" })}
        </Heading>
        <Text as="p" tone="muted">
          {accounts === 0
            ? t({
                en: "Connect a mailbox. Each morning at {hour}, the assistant reads the mail of the day before and writes down what needs you.",
                zh: "请先连接邮箱。每天早上 {hour}，助手会读取前一天的邮件，告诉你需要处理什么。",
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
            href={getLocalePath("/accounts", locale)}
            look="primary"
          >
            {t({ en: "Connect a mailbox", zh: "连接邮箱" })}
          </AnchorButton>
        </div>
      ) : null}
    </div>
  );
}
