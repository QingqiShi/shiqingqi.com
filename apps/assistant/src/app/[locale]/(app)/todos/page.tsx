import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { listTodos } from "#src/assistant/report/read-report.ts";
import {
  groupOpenTodos,
  type TodoGroupKey,
} from "#src/assistant/report-page/group-open-todos.ts";
import { TodoList } from "#src/assistant/report-page/todo-list.tsx";
import { AssistantPageColumn } from "#src/assistant/shell/assistant-page-column.tsx";
import { DayHeader } from "#src/assistant/shell/day-header.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "To-dos", zh: "待办" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/todos");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const [todos, settings] = await Promise.all([
    listTodos(scope),
    readReportSettings(scope),
  ]);
  const today = localClock(new Date(), settings.timeZone).date;
  const groupTitles: Record<TodoGroupKey, string> = {
    overdue: t({ en: "Overdue", zh: "已过期" }),
    today: t({ en: "Today", zh: "今天" }),
    upcoming: t({ en: "Upcoming", zh: "接下来" }),
    "no-date": t({ en: "No date", zh: "没有日期" }),
  };

  return (
    <AssistantPageColumn>
      <div css={stack.group}>
        <header css={stack.text}>
          <Heading level={1} look="h3">
            {t({ en: "To-dos", zh: "待办" })}
          </Heading>
          <Text as="p" look="bodySmall" tone="muted">
            {todos.open.length === 0
              ? t({
                  en: "Nothing open. The morning report adds what your mail asks of you.",
                  zh: "没有未完成的待办。晨报会把邮件里需要你做的事加到这里。",
                })
              : t({ en: "{count} open", zh: "{count} 项未完成" }).replace(
                  "{count}",
                  String(todos.open.length),
                )}
          </Text>
        </header>
        {groupOpenTodos(todos.open, today).map((group) => (
          <section key={group.key} css={stack.tight}>
            <DayHeader level={2}>{groupTitles[group.key]}</DayHeader>
            <TodoList todos={group.todos} today={today} locale={locale} />
          </section>
        ))}
        {todos.done.length > 0 ? (
          <Disclosure
            look="plain"
            summary={t({
              en: "Done ({count})",
              zh: "已完成（{count}）",
            }).replace("{count}", String(todos.done.length))}
          >
            <TodoList todos={todos.done} today={today} locale={locale} />
          </Disclosure>
        ) : null}
      </div>
    </AssistantPageColumn>
  );
}
