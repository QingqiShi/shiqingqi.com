"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
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
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { datesInOrder } from "../report/dates-in-order.ts";
import { addDays } from "../report/local-day-bounds.ts";
import { CalendarSlotSheet } from "./calendar-slot-sheet.tsx";
import { checklistProgress } from "./checklist-progress.tsx";
import { formatListDay, formatSlotTime } from "./format-day.ts";
import { viewOfTodo } from "./group-open-todos.ts";
import { nextWeekStart } from "./parse-todo-date.ts";
import { isOpen, slotIsAhead, type TodoItemData } from "./to-todo-item-data.ts";
import type { TodoEditFocus } from "./todo-editor.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

export function MenuAction({
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

/** How a to-do can move in its list. Each is null where it has no neighbour on that side. */
export interface TodoMoves {
  up: (() => void) | null;
  down: (() => void) | null;
}

/**
 * The popover gives focus back to its button. Then React can move the row in the
 * DOM, and a moved element loses focus. Thus give focus again after the move.
 */
export function useFocusAfterMove(open: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (!open && movedRef.current) {
      movedRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const noteMove = (move: (() => void) | null | undefined) =>
    move
      ? () => {
          movedRef.current = true;
          move();
        }
      : null;

  return { triggerRef, noteMove };
}

/** The actions of an open menu. A closed menu does not format its dates. */
function TodoRowActions({
  todo,
  up,
  down,
  close,
  onEdit,
  onPickSlot,
}: {
  todo: TodoItemData;
  up: (() => void) | null;
  down: (() => void) | null;
  close: () => void;
  onEdit: (field: TodoEditFocus) => void;
  onPickSlot: () => void;
}) {
  const {
    edit,
    remove,
    removeSlot,
    setWaiting,
    today,
    locale,
    timeZone,
    hasCalendar,
    renderedAt,
  } = useTodoStore();
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
  const waiting = todo.waitingOn !== null;
  const startDates = waiting
    ? []
    : [tomorrow, nextWeek].filter(({ date }) =>
        datesInOrder({ startDate: date, dueDate: todo.dueDate }),
      );
  const shownFrom = t({
    en: "Shows in Today from {date}",
    zh: "{date} 起显示在“今天”",
  });

  return (
    <div css={[stack.rows, styles.menu]}>
      {up ? (
        <MenuAction onClick={closeThen(up)}>
          {t({ en: "Move up", zh: "上移" })}
        </MenuAction>
      ) : null}
      {down ? (
        <MenuAction onClick={closeThen(down)}>
          {t({ en: "Move down", zh: "下移" })}
        </MenuAction>
      ) : null}
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
            trailing={todo.waitingOn ?? undefined}
            onClick={closeThen(() => {
              onEdit("waitingOn");
            })}
          >
            {t({ en: "Waiting on…", zh: "等待…" })}
          </MenuAction>
          {waiting ? (
            <MenuAction
              onClick={closeThen(() => {
                setWaiting(todo.id, { waitingOn: null, followUpDate: null });
              })}
            >
              {t({ en: "Stop waiting", zh: "不再等待" })}
            </MenuAction>
          ) : null}
          {todo.calendarSlot ? (
            <MenuAction
              trailing={formatSlotTime(todo.calendarSlot, {
                today,
                locale,
                timeZone,
              })}
              onClick={closeThen(onPickSlot)}
            >
              {t({ en: "Move on calendar…", zh: "在日历上改时间…" })}
            </MenuAction>
          ) : hasCalendar ? (
            <MenuAction onClick={closeThen(onPickSlot)}>
              {t({ en: "Add to calendar…", zh: "加入日历…" })}
            </MenuAction>
          ) : null}
          <MenuAction
            trailing={checklistProgress(todo.checklist)}
            onClick={closeThen(() => {
              onEdit("checklist");
            })}
          >
            {t({ en: "Checklist…", zh: "清单…" })}
          </MenuAction>
          <MenuAction
            onClick={closeThen(() => {
              onEdit("title");
            })}
          >
            {t({ en: "Edit", zh: "编辑" })}
          </MenuAction>
        </>
      ) : null}
      {(
        isOpen(todo)
          ? todo.calendarSlot
          : slotIsAhead(todo.calendarSlot, renderedAt)
      ) ? (
        <MenuAction
          onClick={closeThen(() => {
            removeSlot(todo.id);
          })}
        >
          {t({ en: "Remove from calendar", zh: "从日历上移除" })}
        </MenuAction>
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

/** What a row can do besides ticking it off: move it, reschedule it, edit it and delete it. */
export function TodoRowMenu({
  todo,
  moves,
  onEdit,
}: {
  todo: TodoItemData;
  moves?: TodoMoves;
  /** Opens the row's editor, on the given field. */
  onEdit: (field: TodoEditFocus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickingSlot, setPickingSlot] = useState(false);
  const { triggerRef, noteMove } = useFocusAfterMove(open);
  const moreActions = t({ en: "More actions", zh: "更多操作" });

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-end"
        aria-label={t({ en: "To-do actions", zh: "待办操作" })}
        trigger={(triggerProps) => (
          <Button
            {...triggerProps}
            ref={mergeRefs(triggerProps.ref, triggerRef)}
            size="sm"
            look="ghost"
            icon={<DotsThreeIcon weight="bold" />}
            aria-label={moreActions}
          />
        )}
      >
        <TodoRowActions
          todo={todo}
          up={noteMove(moves?.up)}
          down={noteMove(moves?.down)}
          close={() => {
            setOpen(false);
          }}
          onEdit={onEdit}
          onPickSlot={() => {
            setPickingSlot(true);
          }}
        />
      </Popover>
      <CalendarSlotSheet
        todo={todo}
        isOpen={pickingSlot}
        onClose={() => {
          setPickingSlot(false);
        }}
      />
    </>
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
