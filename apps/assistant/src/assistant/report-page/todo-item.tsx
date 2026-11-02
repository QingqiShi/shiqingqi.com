"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { use, useState, type ReactNode, type Ref } from "react";
import { startsAfter } from "../report/dates-in-order.ts";
import { localClock } from "../report/due-report-date.ts";
import { ChecklistProgress } from "./checklist-progress.tsx";
import { daysBetween, formatShortDate } from "./format-day.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import { ReminderLabel } from "./reminder-label.tsx";
import { RepeatLabel } from "./repeat-label.tsx";
import { TickBox } from "./tick-box.tsx";
import { TodoEditor, type TodoEditFocus } from "./todo-editor.tsx";
import { TodoRowMenu, type TodoMoves } from "./todo-row-menu.tsx";
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
  const { rows, today, locale, timeZone, setDone } = useTodoStore();
  const [editing, setEditing] = useState<TodoEditFocus | null>(null);
  const todo = rows.find((row) => row.id === id);
  if (!todo) return fallback;
  const done = todo.doneAt !== null;
  const notStarted = startsAfter(todo, today);

  if (editing && !done) {
    return (
      <TodoEditor
        todo={todo}
        focus={editing}
        sortable={sortable}
        onClose={() => {
          setEditing(null);
        }}
      />
    );
  }

  return (
    <li ref={sortable?.itemRef} css={[listSurface.item, sortable?.itemCss]}>
      <div css={[listSurface.row, styles.row]}>
        <TickBox
          label={todo.title}
          checked={done}
          disabled={readOnly}
          onChange={(checked) => {
            setDone(id, checked);
          }}
        />
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
          <div css={[cluster.inline, styles.meta]}>
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
      </div>
    </li>
  );
}

const styles = stylex.create({
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
