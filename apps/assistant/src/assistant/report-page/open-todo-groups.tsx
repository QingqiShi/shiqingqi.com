"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Section } from "@tuja/ui/components/section";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { TitleAction } from "../shell/title-action.tsx";
import {
  groupOpenTodos,
  orderRuns,
  viewOfTodo,
  type TodoBoardView,
  type TodoGroupKey,
} from "./group-open-todos.ts";
import { QuickAdd } from "./quick-add.tsx";
import { SortableTodoList } from "./sortable-todo-list.tsx";
import { isOpen, type TodoItemData } from "./to-todo-item-data.ts";
import { TodoListTools, useTodoSelection } from "./todo-selection-area.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

function rowOf(id: string) {
  return document.querySelector<HTMLElement>(`[data-todo-row="${id}"]`);
}

/** Whether the middle of the row shows, not under a bar, a toast or the edge of the screen. */
function inSight(row: HTMLElement | null) {
  if (!row) return false;
  const box = row.getBoundingClientRect();
  const hit = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
  return hit !== null && row.contains(hit);
}

/**
 * The input and the open to-dos of the store: a view of them, by when they
 * matter. A new to-do that lands out of sight, in the other view or below the
 * screen, says where it went, with a way to show it.
 */
export function OpenTodoGroups({
  headingLevel,
  sharedText,
}: {
  headingLevel: 2 | 3;
  sharedText?: string;
}) {
  const { rows, today } = useTodoStore();
  const showToast = useToast();
  const selection = useTodoSelection();
  const [view, setView] = useState<TodoBoardView>("today");
  const showView = (next: TodoBoardView) => {
    selection?.stop();
    setView(next);
  };
  const open = rows.filter(isOpen);
  const views = groupOpenTodos(open, today);
  const addedTo: Record<TodoBoardView, string> = {
    today: t({ en: "Added to Today", zh: "已添加到“今天”" }),
    upcoming: t({ en: "Added to Upcoming", zh: "已添加到“接下来”" }),
  };
  const show = t({ en: "Show", zh: "查看" });
  const viewLabel = (name: string, key: TodoBoardView) => (
    <>
      {name}{" "}
      <Text as="span" look="label" tone="muted" numeric css={styles.count}>
        {views[key].reduce((sum, group) => sum + group.todos.length, 0)}
      </Text>
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
        sharedText={sharedText}
        defaultDueDate={view === "today" ? today : null}
        onAdded={(todo) => {
          const landed = viewOfTodo(todo, today);
          const toast = {
            message: addedTo[landed],
            action: {
              label: show,
              onAction: () => {
                showView(landed);
                requestAnimationFrame(() => {
                  rowOf(todo.id)?.scrollIntoView({ block: "center" });
                });
              },
            },
          };
          if (landed !== view) {
            showToast(toast);
            return;
          }
          requestAnimationFrame(() => {
            if (!inSight(rowOf(todo.id))) showToast(toast);
          });
        }}
      />
      <div css={[flex.between, styles.viewLine]}>
        <SegmentedControl
          aria-label={t({ en: "Which to-dos to show", zh: "显示哪些待办" })}
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
      <TodoGroups groups={views[view]} headingLevel={headingLevel} />
    </>
  );
}

/** The open to-dos of the Today view, for a page about the day: no input, no switch to Upcoming. */
export function DayTodoGroups({ headingLevel }: { headingLevel: 2 | 3 }) {
  const { rows, today } = useTodoStore();
  const groups = groupOpenTodos(rows.filter(isOpen), today).today;
  if (groups.length === 0) {
    return (
      <Text as="p" look="bodySmall" tone="muted">
        {t({ en: "Nothing for today.", zh: "今天没有待办。" })}
      </Text>
    );
  }
  const labelled = groups.length > 1 || groups[0]?.key !== "today";
  return (
    <div css={[stack.item, labelled && styles.belowTitle]}>
      <TodoGroups groups={groups} headingLevel={headingLevel} />
    </div>
  );
}

function TodoGroups({
  groups,
  headingLevel,
}: {
  groups: readonly { key: TodoGroupKey; todos: readonly TodoItemData[] }[];
  headingLevel: 2 | 3;
}) {
  const { moveOverdueToToday } = useTodoStore();
  const groupTitles: Record<TodoGroupKey, string> = {
    overdue: t({ en: "Overdue", zh: "已逾期" }),
    today: t({ en: "Current", zh: "当前" }),
    upcoming: t({ en: "Scheduled", zh: "已安排" }),
    waiting: t({ en: "Waiting", zh: "等待中" }),
    "no-date": t({ en: "No date", zh: "没有日期" }),
  };
  const moveAll = t({ en: "Move all to today", zh: "全部移到今天" });
  return (
    <>
      {groups.map((group) =>
        group.key === "today" && groups.length === 1 ? (
          <section key={group.key}>
            <SortableTodoList runs={orderRuns(group)} />
          </section>
        ) : (
          <Section
            key={group.key}
            level={headingLevel}
            title={groupTitles[group.key]}
            actions={
              group.key === "overdue" ? (
                <TitleAction>
                  <Button
                    size="sm"
                    look="ghost"
                    bleed="end"
                    onClick={moveOverdueToToday}
                  >
                    {moveAll}
                  </Button>
                </TitleAction>
              ) : null
            }
          >
            <SortableTodoList runs={orderRuns(group)} />
          </Section>
        ),
      )}
    </>
  );
}

const styles = stylex.create({
  viewLine: {
    gap: rhythm.tight,
  },
  belowTitle: {
    paddingBlockStart: rhythm.tight,
  },
  count: {
    marginInlineStart: rhythm.inline,
  },
});
