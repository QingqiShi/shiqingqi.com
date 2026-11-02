import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { TodoView } from "../report/read-report.ts";
import { DayHeader } from "../shell/day-header.tsx";
import { groupOpenTodos, type TodoGroupKey } from "./group-open-todos.ts";
import { TodoList } from "./todo-list.tsx";

/** The open to-dos, under a title for when they are due. */
export function OpenTodoGroups({
  todos,
  today,
  locale,
  headingLevel,
}: {
  todos: readonly TodoView[];
  today: string;
  locale: string;
  headingLevel: 2 | 3;
}) {
  const groupTitles: Record<TodoGroupKey, string> = {
    overdue: t({ en: "Overdue", zh: "已过期" }),
    today: t({ en: "Today", zh: "今天" }),
    upcoming: t({ en: "Upcoming", zh: "接下来" }),
    "no-date": t({ en: "No date", zh: "没有日期" }),
  };
  return groupOpenTodos(todos, today).map((group) => (
    <section key={group.key} css={stack.tight}>
      <DayHeader level={headingLevel}>{groupTitles[group.key]}</DayHeader>
      <TodoList todos={group.todos} today={today} locale={locale} />
    </section>
  ));
}
