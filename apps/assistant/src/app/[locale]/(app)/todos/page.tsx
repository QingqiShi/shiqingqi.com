import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { safeNextPath } from "@tuja/server-auth/sign-in-path";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { ASSISTANT_PATH_HEADER } from "#src/assistant/http/constants.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  listTodos,
  searchTodos,
} from "#src/assistant/report/read-report.ts";
import { hasCalendarAccount } from "#src/assistant/report/todo-calendar-slots.ts";
import { todoLimits } from "#src/assistant/report/todo-limits.ts";
import { sharedTodoText } from "#src/assistant/report-page/shared-todo-text.ts";
import { toTodoItemData } from "#src/assistant/report-page/to-todo-item-data.ts";
import { TodoBoard } from "#src/assistant/report-page/todo-board.tsx";
import { TodoSearchBox } from "#src/assistant/report-page/todo-search-box.tsx";
import { TodoSearchResults } from "#src/assistant/report-page/todo-search-results.tsx";
import { TodoStoreProvider } from "#src/assistant/report-page/todo-store-provider.tsx";
import { TodosHeader } from "#src/assistant/report-page/todos-header.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "To-dos", zh: "待办" }) };
}

function queryOf(value: string | string[] | undefined) {
  return typeof value === "string"
    ? value.trim().slice(0, todoLimits.searchChars)
    : "";
}

async function readRows(scope: UserScope, query: string) {
  if (query !== "") return searchTodos(scope, query);
  const { open, done } = await listTodos(scope);
  return { todos: [...open, ...done], hasMore: false };
}

export default async function Page({
  params,
  searchParams,
}: PageProps & {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = validateLocale((await params).locale);
  // Next renders the layout and this page at the same time, so this redirect can
  // come first. It must also keep what another app shared.
  const session = await requirePageSession(
    locale,
    safeNextPath((await headers()).get(ASSISTANT_PATH_HEADER)),
  );
  const scope = { db: getAssistantDb(), userId: session.userId };
  const { q, title, text, url } = await searchParams;
  const query = queryOf(q);
  const renderedAt = new Date().getTime();
  const [{ todos, hasMore }, settings, openCount, hasCalendar] =
    await Promise.all([
      readRows(scope, query),
      readReportSettings(scope),
      countOpenTodos(scope),
      hasCalendarAccount(scope),
    ]);

  const pageTitle = t({ en: "To-dos", zh: "待办" });

  return (
    <NavigationSplitView
      content={{
        label: pageTitle,
        node: (
          <div css={stack.group}>
            <TodosHeader title={pageTitle}>
              <TodoSearchBox
                query={query}
                found={todos.length}
                hasMore={hasMore}
              />
            </TodosHeader>
            <TodoStoreProvider
              key={query}
              todos={todos.map((todo) => toTodoItemData(todo))}
              today={localClock(new Date(), settings.timeZone).date}
              locale={locale}
              timeZone={settings.timeZone}
              openCount={openCount}
              hasCalendar={hasCalendar}
              renderedAt={renderedAt}
            >
              {query === "" ? (
                <TodoBoard sharedText={sharedTodoText({ title, text, url })} />
              ) : (
                <TodoSearchResults />
              )}
            </TodoStoreProvider>
          </div>
        ),
      }}
    />
  );
}
