import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import { listTodos } from "#src/assistant/report/read-report.ts";
import { toTodoItemData } from "#src/assistant/report-page/to-todo-item-data.ts";
import { TodoBoard } from "#src/assistant/report-page/todo-board.tsx";
import { TodoStoreProvider } from "#src/assistant/report-page/todo-store-provider.tsx";
import { AssistantPageColumn } from "#src/assistant/shell/assistant-page-column.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "To-dos", zh: "待办" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  const session = await requirePageSession(locale, "/todos");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const renderedAt = new Date().getTime();
  const [todos, settings] = await Promise.all([
    listTodos(scope),
    readReportSettings(scope),
  ]);

  return (
    <AssistantPageColumn>
      <TodoStoreProvider
        todos={[...todos.open, ...todos.done].map((todo) =>
          toTodoItemData(todo),
        )}
        today={localClock(new Date(), settings.timeZone).date}
        locale={locale}
        timeZone={settings.timeZone}
        openCount={todos.open.length}
        renderedAt={renderedAt}
      >
        <TodoBoard />
      </TodoStoreProvider>
    </AssistantPageColumn>
  );
}
