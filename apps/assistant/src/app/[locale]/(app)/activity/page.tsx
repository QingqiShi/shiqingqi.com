import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { readActivity } from "#src/assistant/activity/read-activity.ts";
import { ActivityView } from "#src/assistant/activity-page/activity-view.tsx";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";

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
  const settings = await readReportSettings(scope);
  const activity = await readActivity(scope, {
    before: beforeOf((await searchParams).before),
    now,
    timeZone: settings.timeZone,
  });

  return (
    <div css={stack.section}>
      <header css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "Activity", zh: "动态" })}
        </Heading>
        <Text as="p" tone="muted">
          {t({
            en: "What the assistant did in your mailbox and calendar, and why. Undo anything that is not what you want.",
            zh: "助手在你的邮箱和日历里做了什么、为什么这样做。不合你意的都可以撤销。",
          })}
        </Text>
      </header>
      {activity.entries.length === 0 ? (
        <Text as="p" tone="muted">
          {t({
            en: "Nothing yet. The first time the assistant tidies your inbox or writes a report, you see what it did.",
            zh: "还没有记录。助手第一次整理收件箱或写晨报后，你会在这里看到它做了什么。",
          })}
        </Text>
      ) : (
        <ActivityView
          entries={activity.entries}
          earlier={activity.earlier}
          now={now}
          place={{ timeZone: settings.timeZone, locale }}
        />
      )}
    </div>
  );
}
