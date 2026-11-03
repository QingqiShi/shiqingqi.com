import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Heading } from "@tuja/ui/components/heading";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/assistant/auth/require-page-session.ts";
import { getAssistantDb } from "#src/assistant/db/get-assistant-db.ts";
import type { UserScope } from "#src/assistant/db/types.ts";
import { localClock } from "#src/assistant/report/due-report-date.ts";
import { readReportSettings } from "#src/assistant/report/read-report-settings.ts";
import {
  countOpenTodos,
  listTodos,
  searchTodos,
} from "#src/assistant/report/read-report.ts";
import { todoLimits } from "#src/assistant/report/todo-limits.ts";
import { toTodoItemData } from "#src/assistant/report-page/to-todo-item-data.ts";
import { TodoBoard } from "#src/assistant/report-page/todo-board.tsx";
import { TodoSearchBox } from "#src/assistant/report-page/todo-search-box.tsx";
import { TodoSearchResults } from "#src/assistant/report-page/todo-search-results.tsx";
import { TodoStoreProvider } from "#src/assistant/report-page/todo-store-provider.tsx";
import { AssistantPageColumn } from "#src/assistant/shell/assistant-page-column.tsx";

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
  const session = await requirePageSession(locale, "/todos");
  const scope = { db: getAssistantDb(), userId: session.userId };
  const query = queryOf((await searchParams).q);
  const renderedAt = new Date().getTime();
  const [{ todos, hasMore }, settings, openCount] = await Promise.all([
    readRows(scope, query),
    readReportSettings(scope),
    countOpenTodos(scope),
  ]);

  return (
    <AssistantPageColumn>
      <div css={stack.group}>
        <header css={[flex.wrap, styles.header]}>
          <Heading level={1} look="h3">
            {t({ en: "To-dos", zh: "待办" })}
          </Heading>
          <TodoSearchBox
            query={query}
            found={todos.length}
            hasMore={hasMore}
            css={styles.search}
          />
        </header>
        <TodoStoreProvider
          key={query}
          todos={todos.map((todo) => toTodoItemData(todo))}
          today={localClock(new Date(), settings.timeZone).date}
          locale={locale}
          timeZone={settings.timeZone}
          openCount={openCount}
          renderedAt={renderedAt}
        >
          {query === "" ? <TodoBoard /> : <TodoSearchResults />}
        </TodoStoreProvider>
      </div>
    </AssistantPageColumn>
  );
}

const styles = stylex.create({
  header: {
    alignItems: "baseline",
    columnGap: rhythm.group,
    rowGap: rhythm.tight,
  },
  search: {
    flexBasis: "10rem",
    flexGrow: 1,
    minInlineSize: 0,
  },
});
