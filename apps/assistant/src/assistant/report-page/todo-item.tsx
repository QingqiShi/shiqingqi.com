"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import {
  use,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { startsAfter } from "../report/dates-in-order.ts";
import { localClock } from "../report/due-report-date.ts";
import { CalendarSlotLabel } from "./calendar-slot-label.tsx";
import { ChecklistProgress } from "./checklist-progress.tsx";
import { daysBetween, formatShortDate } from "./format-day.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import { ReminderLabel } from "./reminder-label.tsx";
import { RepeatLabel } from "./repeat-label.tsx";
import { TickBox } from "./tick-box.tsx";
import { slotIsAhead } from "./to-todo-item-data.ts";
import { TodoEditor, type TodoEditFocus } from "./todo-editor.tsx";
import { TodoRowMenu, type TodoMoves } from "./todo-row-menu.tsx";
import { useTodoSelection } from "./todo-selection-area.tsx";
import { todoShortcutOf } from "./todo-shortcut-of.ts";
import { useTodoStore } from "./todo-store-provider.tsx";
import { TodosReadOnlyContext } from "./todos-read-only.tsx";

function DueBadge({
  dueDate,
  started,
  today,
  locale,
}: {
  dueDate: string;
  started: boolean;
  today: string;
  locale: string;
}) {
  const days = daysBetween(today, dueDate);
  const date = formatShortDate(dueDate, locale);
  return (
    <Badge size="sm" intent={started && days <= 1 ? "warning" : "neutral"}>
      {days < 0
        ? t({ en: "Overdue since {date}", zh: "{date} 已到期" }).replace(
            "{date}",
            date,
          )
        : days === 0
          ? t({ en: "Due today", zh: "今天到期" })
          : t({ en: "Due {date}", zh: "{date} 到期" }).replace("{date}", date)}
    </Badge>
  );
}

function FollowUpBadge({
  date,
  today,
  locale,
}: {
  date: string;
  today: string;
  locale: string;
}) {
  const days = daysBetween(today, date);
  return (
    <Badge size="sm" intent={days <= 0 ? "warning" : "neutral"}>
      {days === 0
        ? t({ en: "Follow up today", zh: "今天跟进" })
        : t({ en: "Follow up {date}", zh: "{date} 跟进" }).replace(
            "{date}",
            formatShortDate(date, locale),
          )}
    </Badge>
  );
}

/** What a list that the owner can put in order gives each of its rows. */
export interface TodoItemSortable {
  itemRef: Ref<HTMLLIElement>;
  itemCss: StyleProp;
  /** Where a pointer picks the row up. */
  handle: ReactNode;
  moves: TodoMoves;
}

/**
 * One to-do: a box to tick it off, its title, which opens its editor in place,
 * and a menu for all else. It shows `fallback` once the to-do is deleted.
 */
export function TodoItem({
  id,
  showSource = false,
  showDoneDate = false,
  fallback = null,
  sortable,
}: {
  id: string;
  /** Say that the morning report added it. The report's own page does not need to. */
  showSource?: boolean;
  /** Say which day it was done, where no day heading says so. */
  showDoneDate?: boolean;
  fallback?: ReactNode;
  sortable?: TodoItemSortable;
}) {
  const readOnly = use(TodosReadOnlyContext);
  const { rows, today, locale, timeZone, renderedAt, setDone } = useTodoStore();
  const selection = useTodoSelection();
  const [editing, setEditing] = useState<TodoEditFocus | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  const backToRowRef = useRef(false);

  useEffect(() => {
    if (editing === null && backToRowRef.current) {
      backToRowRef.current = false;
      rowRef.current?.focus();
    }
  }, [editing]);

  const todo = rows.find((row) => row.id === id);
  if (!todo) return fallback;
  const done = todo.doneAt !== null;
  const notStarted = startsAfter(todo, today);
  const selecting = selection !== null && selection.selecting && !done;
  const selected = selecting && selection.isSelected(id);

  if (editing && !done) {
    return (
      <TodoEditor
        todo={todo}
        focus={editing}
        sortable={sortable}
        onClose={() => {
          backToRowRef.current = true;
          setEditing(null);
        }}
      />
    );
  }

  function pickOnClick(event: MouseEvent<HTMLLIElement>) {
    const { target, shiftKey } = event;
    const isBox = target instanceof HTMLInputElement;
    const picks = shiftKey || (selecting && !isBox);
    if (
      selection === null ||
      done ||
      !picks ||
      !(target instanceof Node && event.currentTarget.contains(target))
    ) {
      return;
    }
    event.stopPropagation();
    if (!isBox) event.preventDefault();
    selection.pick(id, shiftKey);
  }

  return (
    <li
      ref={mergeRefs(sortable?.itemRef, rowRef)}
      data-todo-row={selection ? id : undefined}
      tabIndex={selection ? -1 : undefined}
      css={[
        listSurface.item,
        selection && a11y.focusRingInset,
        selection && styles.clearOfBar,
        selecting && styles.selectable,
        selected && styles.selected,
        sortable?.itemCss,
      ]}
      onClickCapture={pickOnClick}
      onMouseDown={(event) => {
        if (selection && event.shiftKey) event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (
          selection &&
          !selecting &&
          !done &&
          todoShortcutOf(event.nativeEvent) === "edit"
        ) {
          event.preventDefault();
          setEditing("title");
        }
      }}
    >
      <div css={[listSurface.row, styles.row]}>
        {selecting ? (
          <TickBox
            key="select"
            label={t({ en: "Select {title}", zh: "选择 {title}" }).replace(
              "{title}",
              todo.title,
            )}
            checked={selected}
            onChange={() => {
              selection.pick(id, false);
            }}
          />
        ) : (
          <TickBox
            label={todo.title}
            checked={done}
            disabled={readOnly}
            onChange={(checked) => {
              setDone(id, checked);
            }}
          />
        )}
        <div css={[stack.text, styles.main]}>
          {done ? (
            <Text as="p" css={styles.doneTitle}>
              {todo.title}
            </Text>
          ) : readOnly ? (
            <Text as="p">{todo.title}</Text>
          ) : (
            <button
              type="button"
              css={[buttonReset.base, typeRole.control, styles.title]}
              onClick={() => {
                setEditing("title");
              }}
            >
              {todo.title}
            </button>
          )}
          {todo.detail ? (
            <Text as="p" look="bodySmall" tone="muted">
              {todo.detail}
            </Text>
          ) : null}
          {done && todo.doneReason ? (
            <Text as="p" look="bodySmall" tone="muted">
              {t({
                en: "The morning report closed this: {reason}",
                zh: "晨报关闭了这项：{reason}",
              }).replace("{reason}", todo.doneReason)}
            </Text>
          ) : null}
          {!done && todo.waitingNote ? (
            <Text as="p" look="bodySmall" tone="muted">
              {(todo.waitingOn === null
                ? t({
                    en: "The reply came: {reason}",
                    zh: "回复已到：{reason}",
                  })
                : t({
                    en: "The morning report says: {reason}",
                    zh: "晨报说：{reason}",
                  })
              ).replace("{reason}", todo.waitingNote)}
            </Text>
          ) : null}
          <div css={[cluster.inline, styles.meta]}>
            {todo.waitingOn !== null && !done ? (
              <Badge size="sm" intent="info" css={styles.waitingOn}>
                <span css={truncate.base}>
                  {t({ en: "Waiting on {who}", zh: "在等 {who}" }).replace(
                    "{who}",
                    todo.waitingOn,
                  )}
                </span>
              </Badge>
            ) : null}
            {todo.waitingOn !== null && todo.followUpDate !== null && !done ? (
              <FollowUpBadge
                date={todo.followUpDate}
                today={today}
                locale={locale}
              />
            ) : null}
            {todo.dueDate !== null && !done ? (
              <DueBadge
                dueDate={todo.dueDate}
                started={!notStarted}
                today={today}
                locale={locale}
              />
            ) : null}
            {todo.startDate !== null && notStarted && !done ? (
              <Badge size="sm" intent="neutral">
                {t({ en: "Starts {date}", zh: "{date} 开始" }).replace(
                  "{date}",
                  formatShortDate(todo.startDate, locale),
                )}
              </Badge>
            ) : null}
            {todo.repeat && !done ? (
              <RepeatLabel rule={todo.repeat} locale={locale} />
            ) : null}
            {todo.nextReminderAt && !done ? (
              <ReminderLabel time={todo.nextReminderAt} />
            ) : null}
            {todo.calendarSlot &&
            (!done || slotIsAhead(todo.calendarSlot, renderedAt)) ? (
              <CalendarSlotLabel slot={todo.calendarSlot} stillHeld={done} />
            ) : null}
            {todo.checklist.length > 0 && !done ? (
              <ChecklistProgress
                steps={todo.checklist}
                onOpen={
                  readOnly
                    ? undefined
                    : () => {
                        setEditing("checklist");
                      }
                }
              />
            ) : null}
            {showDoneDate && todo.doneAt !== null ? (
              <Text look="caption" tone="muted">
                {t({ en: "Done {date}", zh: "{date} 完成" }).replace(
                  "{date}",
                  formatShortDate(
                    localClock(new Date(todo.doneAt), timeZone).date,
                    locale,
                  ),
                )}
              </Text>
            ) : null}
            {showSource && todo.createdBy === "report" ? (
              <Text look="caption" tone="muted">
                {t({ en: "From the morning report", zh: "来自晨报" })}
              </Text>
            ) : null}
            {todo.reAdded ? (
              <Text look="caption" tone="muted">
                {t({ en: "You deleted this before", zh: "你之前删过" })}
              </Text>
            ) : null}
            {done && !readOnly ? (
              <Button
                size="sm"
                look="ghost"
                css={styles.reopen}
                onClick={() => {
                  setDone(id, false);
                }}
              >
                {t({ en: "Reopen", zh: "重新打开" })}
              </Button>
            ) : null}
          </div>
        </div>
        {selecting ? null : (
          <div css={styles.actions}>
            {todo.openHref ? <OpenMailButton href={todo.openHref} /> : null}
            {sortable?.handle}
            {readOnly ? null : (
              <TodoRowMenu
                todo={todo}
                moves={sortable?.moves}
                onEdit={setEditing}
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

const styles = stylex.create({
  clearOfBar: {
    scrollMarginBlock: "6rem",
  },
  selectable: {
    cursor: "pointer",
    userSelect: "none",
  },
  selected: {
    backgroundColor: color.bgAccentSubtle,
  },
  row: {
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  main: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    color: color.fg,
    textAlign: "start",
  },
  doneTitle: {
    color: color.fgMuted,
    textDecorationLine: "line-through",
  },
  meta: {
    marginBlockStart: {
      default: 0,
      ":not(:empty)": rhythm.inline,
    },
  },
  waitingOn: {
    maxInlineSize: "100%",
  },
  // Alone on its line, the label starts under the title, not its button's padding.
  reopen: {
    marginInlineStart: {
      default: 0,
      ":first-child": `calc(-1 * ${controlSize._2})`,
    },
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
});
