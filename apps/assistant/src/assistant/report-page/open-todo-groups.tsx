"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { flex, grow } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { DayHeader } from "../shell/day-header.tsx";
import {
  groupOpenTodos,
  orderRuns,
  viewOfTodo,
  type TodoBoardView,
  type TodoGroupKey,
} from "./group-open-todos.ts";
import { QuickAdd } from "./quick-add.tsx";
import { SortableTodoList } from "./sortable-todo-list.tsx";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoListTools, useTodoSelection } from "./todo-selection-area.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The input and the open to-dos of the store: a view of them, by when they matter. */
export function OpenTodoGroups({ headingLevel }: { headingLevel: 2 | 3 }) {
  const { rows, today, moveOverdueToToday } = useTodoStore();
  const showToast = useToast();
  const selection = useTodoSelection();
  const [view, setView] = useState<TodoBoardView>("today");
  const showView = (next: TodoBoardView) => {
    selection?.stop();
    setView(next);
  };
  const open = rows.filter(isOpen);
  const views = groupOpenTodos(open, today);
  const groupTitles: Record<TodoGroupKey, string> = {
    overdue: t({ en: "Overdue", zh: "已过期" }),
    today: t({ en: "Today", zh: "今天" }),
    upcoming: t({ en: "Scheduled", zh: "已安排" }),
    waiting: t({ en: "Waiting", zh: "等待中" }),
    "no-date": t({ en: "No date", zh: "没有日期" }),
  };
  const moveAll = t({ en: "Move all to today", zh: "全部移到今天" });
  const addedTo: Record<TodoBoardView, string> = {
    today: t({ en: "Added to Today", zh: "已添加到“今天”" }),
    upcoming: t({ en: "Added to Upcoming", zh: "已添加到“接下来”" }),
  };
  const show = t({ en: "Show", zh: "查看" });
  const viewLabel = (name: string, key: TodoBoardView) => (
    <>
      {name}{" "}
      <span css={[typeModifier.numeric, styles.count]}>
        {views[key].reduce((sum, group) => sum + group.todos.length, 0)}
      </span>
    </>
  );

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
      <QuickAdd
        onAdded={(todo) => {
          const landed = viewOfTodo(todo, today);
          if (landed !== view) {
            showToast({
              message: addedTo[landed],
              action: {
                label: show,
                onAction: () => {
                  showView(landed);
                },
              },
            });
          }
        }}
      />
      <div css={[flex.row, styles.viewLine]}>
        <SegmentedControl
          aria-label={t({ en: "Which to-dos to show", zh: "显示哪些待办" })}
          fullWidth
          options={[
            {
              value: "today",
              label: viewLabel(t({ en: "Today", zh: "今天" }), "today"),
            },
            {
              value: "upcoming",
              label: viewLabel(t({ en: "Upcoming", zh: "接下来" }), "upcoming"),
            },
          ]}
          value={view}
          onChange={showView}
          css={grow._1}
        />
        <TodoListTools />
      </div>
      {views[view].length === 0 && open.length > 0 ? (
        <Text as="p" tone="muted">
          {view === "today"
            ? t({ en: "Nothing for today.", zh: "今天没有待办。" })
            : t({ en: "Nothing coming up.", zh: "接下来没有待办。" })}
        </Text>
      ) : null}
      {views[view].map((group) => (
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
          <SortableTodoList runs={orderRuns(group)} />
        </section>
      ))}
    </>
  );
}

const styles = stylex.create({
  viewLine: {
    gap: rhythm.tight,
  },
  count: {
    color: color.fgMuted,
    marginInlineStart: rhythm.inline,
  },
});
