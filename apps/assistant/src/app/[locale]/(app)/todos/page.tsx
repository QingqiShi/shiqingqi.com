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
import { withUser } from "#src/assistant/db/with-user.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { listTodos } from "#src/assistant/report/read-report.ts";
import { TodoList } from "#src/assistant/report-page/todo-list.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "To-dos", zh: "待办" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/todos");
  const { todos, settings } = await withUser(
    getAssistantDb(),
    session.userId,
    async (scope) => ({
      todos: await listTodos(scope),
      settings: await readReportSettings(scope),
    }),
  );
  const today = localClock(new Date(), settings.timeZone).date;

  return (
    <div css={stack.section}>
      <header css={stack.tight}>
        <Heading level={1} look="h1">
          {t({ en: "To-dos", zh: "待办" })}
        </Heading>
        <Text as="p" tone="muted">
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
      {todos.open.length > 0 ? (
        <TodoList todos={todos.open} today={today} locale={locale} />
      ) : null}
      {todos.done.length > 0 ? (
        <Disclosure
          look="plain"
          summary={t({ en: "Done ({count})", zh: "已完成（{count}）" }).replace(
            "{count}",
            String(todos.done.length),
          )}
        >
          <TodoList todos={todos.done} today={today} locale={locale} />
        </Disclosure>
      ) : null}
    </div>
  );
}
