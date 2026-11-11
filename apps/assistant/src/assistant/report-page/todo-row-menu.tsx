"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Divider } from "@tuja/ui/components/divider";
import { MenuItem } from "@tuja/ui/components/menu-item";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
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

/** The groups of a menu, with a line between each two. A null group shows nothing. */
function MenuGroups({ groups }: { groups: readonly ReactNode[] }) {
  return (
    <div css={[stack.rows, styles.menu]}>
      {groups
        .filter((group) => group !== null)
        .map((group, index) => (
          <Fragment key={index}>
            {index > 0 ? <Divider css={styles.divider} /> : null}
            {group}
          </Fragment>
        ))}
    </div>
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
    moveMany,
    setDone,
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
    zh: "{date}起显示在“今天”",
  });

  const open = isOpen(todo);
  const removesSlot = open
    ? todo.calendarSlot !== null
    : slotIsAhead(todo.calendarSlot, renderedAt);

  return (
    <MenuGroups
      groups={[
        open ? null : (
          <MenuItem
            size="sm"
            key="reopen"
            onClick={closeThen(() => {
              setDone(todo.id, false);
            })}
          >
            {t({ en: "Reopen", zh: "重新打开" })}
          </MenuItem>
        ),
        open ? (
          <Fragment key="due">
            <MenuCaption>{t({ en: "Due", zh: "到期" })}</MenuCaption>
            {dueDates.map(({ date, label }) => (
              <MenuItem
                size="sm"
                key={date}
                trailing={formatListDay(date, locale)}
                current={todo.dueDate === date}
                onClick={closeThen(() => {
                  if (todo.dueDate !== date) moveMany([todo.id], date);
                })}
              >
                {label}
              </MenuItem>
            ))}
            <MenuItem
              size="sm"
              onClick={closeThen(() => {
                onEdit("dueDate");
              })}
            >
              {t({ en: "Pick a date…", zh: "选择日期…" })}
            </MenuItem>
            {todo.dueDate !== null ? (
              <MenuItem
                size="sm"
                onClick={closeThen(() => {
                  moveMany([todo.id], null);
                })}
              >
                {t({ en: "No date", zh: "不设日期" })}
              </MenuItem>
            ) : null}
          </Fragment>
        ) : null,
        open && startDates.length > 0 ? (
          <Fragment key="later">
            <MenuCaption>{t({ en: "Later", zh: "稍后再看" })}</MenuCaption>
            {startDates.map(({ date, label }) => (
              <MenuItem
                size="sm"
                key={date}
                trailing={formatListDay(date, locale)}
                current={todo.startDate === date}
                onClick={closeThen(() => {
                  edit(todo.id, { startDate: date }, { quiet: true });
                  showToast({
                    message: shownFrom.replace(
                      "{date}",
                      formatListDay(date, locale),
                    ),
                  });
                })}
              >
                {label}
              </MenuItem>
            ))}
            <MenuItem
              size="sm"
              onClick={closeThen(() => {
                onEdit("startDate");
              })}
            >
              {t({ en: "Pick a date…", zh: "选择日期…" })}
            </MenuItem>
            {viewOfTodo(todo, today) === "upcoming" ? (
              <MenuItem
                size="sm"
                onClick={closeThen(() => {
                  edit(todo.id, { startDate: today }, { quiet: true });
                })}
              >
                {t({ en: "Show today", zh: "今天就显示" })}
              </MenuItem>
            ) : null}
          </Fragment>
        ) : null,
        open ? (
          <Fragment key="more">
            <MenuItem
              size="sm"
              trailing={todo.waitingOn ?? undefined}
              onClick={closeThen(() => {
                onEdit("waitingOn");
              })}
            >
              {t({ en: "Waiting on…", zh: "等待…" })}
            </MenuItem>
            {waiting ? (
              <MenuItem
                size="sm"
                onClick={closeThen(() => {
                  setWaiting(todo.id, { waitingOn: null, followUpDate: null });
                })}
              >
                {t({ en: "Stop waiting", zh: "不再等待" })}
              </MenuItem>
            ) : null}
            {todo.calendarSlot ? (
              <MenuItem
                size="sm"
                trailing={formatSlotTime(todo.calendarSlot, {
                  today,
                  locale,
                  timeZone,
                })}
                onClick={closeThen(onPickSlot)}
              >
                {t({ en: "Move on calendar…", zh: "在日历上改时间…" })}
              </MenuItem>
            ) : hasCalendar ? (
              <MenuItem size="sm" onClick={closeThen(onPickSlot)}>
                {t({ en: "Add to calendar…", zh: "加入日历…" })}
              </MenuItem>
            ) : null}
            <MenuItem
              size="sm"
              trailing={checklistProgress(todo.checklist)}
              onClick={closeThen(() => {
                onEdit("checklist");
              })}
            >
              {t({ en: "Checklist…", zh: "清单…" })}
            </MenuItem>
            <MenuItem
              size="sm"
              onClick={closeThen(() => {
                onEdit("title");
              })}
            >
              {t({ en: "Edit", zh: "编辑" })}
            </MenuItem>
          </Fragment>
        ) : null,
        up || down ? (
          <Fragment key="move">
            {up ? (
              <MenuItem size="sm" onClick={closeThen(up)}>
                {t({ en: "Move up", zh: "上移" })}
              </MenuItem>
            ) : null}
            {down ? (
              <MenuItem size="sm" onClick={closeThen(down)}>
                {t({ en: "Move down", zh: "下移" })}
              </MenuItem>
            ) : null}
          </Fragment>
        ) : null,
        <Fragment key="remove">
          {removesSlot ? (
            <MenuItem
              size="sm"
              onClick={closeThen(() => {
                removeSlot(todo.id);
              })}
            >
              {t({ en: "Remove from calendar", zh: "从日历上移除" })}
            </MenuItem>
          ) : null}
          <MenuItem
            size="sm"
            intent="destructive"
            onClick={closeThen(() => {
              remove(todo.id);
            })}
          >
            {t({ en: "Delete", zh: "删除" })}
          </MenuItem>
        </Fragment>,
      ]}
    />
  );
}

/** What a row can do besides ticking it off: reschedule it, edit it, move it and delete it. */
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
            bleed="end"
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
  divider: {
    marginBlock: rhythm.inline,
  },
  caption: {
    paddingBlockStart: space._1,
    paddingInline: controlSize._3,
  },
});
