"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { datesInOrder } from "../report/dates-in-order.ts";
import { addDays } from "../report/local-day-bounds.ts";
import { formatListDay } from "./format-day.ts";
import { viewOfTodo } from "./group-open-todos.ts";
import { nextWeekStart } from "./parse-todo-date.ts";
import { isOpen, type TodoItemData } from "./to-todo-item-data.ts";
import type { TodoEditFocus } from "./todo-editor.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

function MenuAction({
  children,
  trailing,
  current = false,
  danger = false,
  onClick,
}: {
  children: ReactNode;
  trailing?: string;
  current?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={current ? "true" : undefined}
      onClick={onClick}
      css={[
        buttonReset.base,
        flex.between,
        typeRole.control,
        corner.radius_1,
        a11y.touchRow,
        quietSurface.interactive,
        styles.action,
        danger && styles.danger,
      ]}
    >
      <span>{children}</span>
      {trailing ? (
        <Text look="caption" tone="muted">
          {trailing}
        </Text>
      ) : null}
    </button>
  );
}

function MenuCaption({ children }: { children: string }) {
  return (
    <Text as="p" look="caption" tone="muted" css={styles.caption}>
      {children}
    </Text>
  );
}

/** The actions of an open menu. A closed menu does not format its dates. */
function TodoRowActions({
  todo,
  close,
  onEdit,
}: {
  todo: TodoItemData;
  close: () => void;
  onEdit: (field: TodoEditFocus) => void;
}) {
  const { edit, remove, today, locale } = useTodoStore();
  const showToast = useToast();
  const closeThen = (action: () => void) => () => {
    close();
    action();
  };
  const tomorrow = {
    date: addDays(today, 1),
    label: t({ en: "Tomorrow", zh: "明天" }),
  };
  const nextWeek = {
    date: nextWeekStart(today),
    label: t({ en: "Next week", zh: "下周" }),
  };
  const dueDates = [
    { date: today, label: t({ en: "Today", zh: "今天" }) },
    tomorrow,
    nextWeek,
  ];
  const startDates = [tomorrow, nextWeek].filter(({ date }) =>
    datesInOrder({ startDate: date, dueDate: todo.dueDate }),
  );
  const shownFrom = t({
    en: "Shows in Today from {date}",
    zh: "{date} 起显示在“今天”",
  });

  return (
    <div css={[stack.rows, styles.menu]}>
      {isOpen(todo) ? (
        <>
          <MenuCaption>{t({ en: "Due", zh: "到期" })}</MenuCaption>
          {dueDates.map(({ date, label }) => (
            <MenuAction
              key={date}
              trailing={formatListDay(date, locale)}
              current={todo.dueDate === date}
              onClick={closeThen(() => {
                edit(todo.id, { dueDate: date });
              })}
            >
              {label}
            </MenuAction>
          ))}
          <MenuAction
            onClick={closeThen(() => {
              onEdit("dueDate");
            })}
          >
            {t({ en: "Pick a date…", zh: "选择日期…" })}
          </MenuAction>
          {todo.dueDate !== null ? (
            <MenuAction
              onClick={closeThen(() => {
                edit(todo.id, { dueDate: null });
              })}
            >
              {t({ en: "No date", zh: "不设日期" })}
            </MenuAction>
          ) : null}
          {startDates.length > 0 ? (
            <>
              <MenuCaption>{t({ en: "Later", zh: "稍后再看" })}</MenuCaption>
              {startDates.map(({ date, label }) => (
                <MenuAction
                  key={date}
                  trailing={formatListDay(date, locale)}
                  current={todo.startDate === date}
                  onClick={closeThen(() => {
                    edit(todo.id, { startDate: date });
                    showToast({
                      message: shownFrom.replace(
                        "{date}",
                        formatListDay(date, locale),
                      ),
                    });
                  })}
                >
                  {label}
                </MenuAction>
              ))}
              <MenuAction
                onClick={closeThen(() => {
                  onEdit("startDate");
                })}
              >
                {t({ en: "Pick a date…", zh: "选择日期…" })}
              </MenuAction>
              {viewOfTodo(todo, today) === "upcoming" ? (
                <MenuAction
                  onClick={closeThen(() => {
                    edit(todo.id, { startDate: today });
                  })}
                >
                  {t({ en: "Show today", zh: "今天就显示" })}
                </MenuAction>
              ) : null}
            </>
          ) : null}
          <MenuAction
            onClick={closeThen(() => {
              onEdit("title");
            })}
          >
            {t({ en: "Edit", zh: "编辑" })}
          </MenuAction>
        </>
      ) : null}
      <MenuAction
        danger
        onClick={closeThen(() => {
          remove(todo.id);
        })}
      >
        {t({ en: "Delete", zh: "删除" })}
      </MenuAction>
    </div>
  );
}

/** What a row can do besides ticking it off: reschedule it, edit it and delete it. */
export function TodoRowMenu({
  todo,
  onEdit,
}: {
  todo: TodoItemData;
  /** Opens the row's editor, on the given field. */
  onEdit: (field: TodoEditFocus) => void;
}) {
  const [open, setOpen] = useState(false);
  const moreActions = t({ en: "More actions", zh: "更多操作" });

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      aria-label={t({ en: "To-do actions", zh: "待办操作" })}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          size="sm"
          look="ghost"
          icon={<DotsThreeIcon weight="bold" />}
          aria-label={moreActions}
        />
      )}
    >
      <TodoRowActions
        todo={todo}
        close={() => {
          setOpen(false);
        }}
        onEdit={onEdit}
      />
    </Popover>
  );
}

const styles = stylex.create({
  menu: {
    minInlineSize: "13rem",
  },
  caption: {
    paddingBlockStart: space._1,
    paddingInline: space._2,
  },
  action: {
    gap: rhythm.item,
    inlineSize: "100%",
    paddingBlock: space._1,
    paddingInline: space._2,
    color: color.fg,
    textAlign: "start",
  },
  danger: {
    color: color.fgDanger,
  },
});
