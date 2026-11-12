import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { readActivity } from "#src/assistant/activity/read-activity.ts";
import { ActivityView } from "#src/assistant/activity-page/activity-view.tsx";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { MailboxesLink } from "#src/assistant/mailboxes/mailboxes-link.tsx";
import { readMailboxHealth } from "#src/assistant/mailboxes/read-mailbox-health.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { fillTemplate } from "#src/assistant/shell/fill-template.tsx";
import { getDateLocale } from "#src/assistant/shell/get-date-locale.ts";
import { keepHyphenated } from "#src/assistant/shell/keep-hyphenated.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Activity", zh: "动态" }) };
}

function beforeOf(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/activity");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const now = new Date();
  const [settings, mailboxes] = await Promise.all([
    readReportSettings(scope),
    readMailboxHealth(scope),
  ]);
  const activity = await readActivity(scope, {
    before: beforeOf((await searchParams).before),
    now,
    timeZone: settings.timeZone,
  });

  const title = t({ en: "Activity", zh: "动态" });

  return (
    <NavigationStack label={title}>
      <div css={stack.group}>
        <header css={stack.tight}>
          <Heading level={1} look="h1">
            {title}
          </Heading>
          <Text as="p" look="bodySmall" tone="muted">
            {keepHyphenated(
              t({
                en: "What the assistant did in your mailbox, calendar and to-dos, and why. Undo anything that is not what you want.",
                zh: "助手在你的邮箱、日历和待办里做了什么、为什么这样做。不合你意的都可以撤销。",
              }),
            )}
          </Text>
        </header>
        {activity.entries.length === 0 ? (
          <Text as="p" tone="muted">
            {mailboxes.connected === 0
              ? fillTemplate(
                  t({
                    en: "Nothing yet. Once you connect a mailbox in {mailboxes}, this page lists each run that files your mail or writes the morning report, with what it changed and why.",
                    zh: "还没有记录。在{mailboxes}中连接邮箱后，助手每次整理邮件或写晨报都会列在这里，写明改了什么、为什么。",
                  }),
                  {
                    mailboxes: <MailboxesLink />,
                  },
                )
              : t({
                  en: "Nothing yet. This page lists each run that files your mail or writes the morning report, with what it changed and why.",
                  zh: "还没有记录。助手每次整理邮件或写晨报都会列在这里，写明改了什么、为什么。",
                })}
          </Text>
        ) : (
          <ActivityView
            entries={activity.entries}
            earlier={activity.earlier}
            now={now}
            place={{
              timeZone: settings.timeZone,
              locale,
              dateLocale: await getDateLocale(locale),
            }}
            reconnect={mailboxes.reconnect}
          />
        )}
      </div>
    </NavigationStack>
  );
}
