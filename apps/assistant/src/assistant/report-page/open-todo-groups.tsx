"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DayHeader } from "../shell/day-header.tsx";
import { groupOpenTodos, type TodoGroupKey } from "./group-open-todos.ts";
import { QuickAdd } from "./quick-add.tsx";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The input and the open to-dos of the store, under a title for when they are due. */
export function OpenTodoGroups({ headingLevel }: { headingLevel: 2 | 3 }) {
  const { rows, today, moveOverdueToToday } = useTodoStore();
  const open = rows.filter(isOpen);
  const groupTitles: Record<TodoGroupKey, string> = {
    overdue: t({ en: "Overdue", zh: "已过期" }),
    today: t({ en: "Today", zh: "今天" }),
    upcoming: t({ en: "Upcoming", zh: "接下来" }),
    "no-date": t({ en: "No date", zh: "没有日期" }),
  };
  const moveAll = t({ en: "Move all to today", zh: "全部移到今天" });

  return (
    <>
      {open.length === 0 ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Nothing open. Add one below, and the morning report adds what your mail asks of you.",
            zh: "没有未完成的待办。可以在下面添加，晨报也会把邮件里需要你做的事加进来。",
          })}
        </Text>
      ) : null}
      <QuickAdd />
      {groupOpenTodos(open, today).map((group) => (
        <section key={group.key} css={stack.tight}>
          <DayHeader
            level={headingLevel}
            trailing={
              group.key === "overdue" ? (
                <Button size="sm" look="ghost" onClick={moveOverdueToToday}>
                  {moveAll}
                </Button>
              ) : null
            }
          >
            {groupTitles[group.key]}
          </DayHeader>
          <TodoList ids={group.todos.map((todo) => todo.id)} showSource />
        </section>
      ))}
    </>
  );
}
