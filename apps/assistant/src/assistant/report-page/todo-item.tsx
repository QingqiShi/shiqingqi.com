"use client";

import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { HourglassIcon } from "@phosphor-icons/react/dist/ssr/Hourglass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
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
import { NoteText } from "./note-text.tsx";
import { OpenMailLink } from "./open-mail-button.tsx";
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
    <Badge
      size="sm"
      intent={
        !started || days > 1 ? "neutral" : days < 0 ? "destructive" : "warning"
      }
    >
      {days < 0
        ? t({ en: "Overdue since {date}", zh: "{date}起逾期" }).replace(
            "{date}",
            date,
          )
        : days === 0
          ? t({ en: "Due today", zh: "今天到期" })
          : days === 1
            ? t({ en: "Due tomorrow", zh: "明天到期" })
            : t({ en: "Due {date}", zh: "{date}到期" }).replace("{date}", date)}
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
        : t({ en: "Follow up {date}", zh: "{date}跟进" }).replace(
            "{date}",
            formatShortDate(date, locale),
          )}
    </Badge>
  );
}

/**
 * Why the morning report closed the to-do, or what it says of the wait, led by
 * the glyph that the activity page gives that change, so that it does not read
 * as part of the note above it. The glyph sits in the text, as the icon of
 * "Open mail" does, so that a wrapped line starts at the row's text edge.
 */
function ReasonLine({
  glyph,
  children,
}: {
  glyph: ReactNode;
  children: string;
}) {
  return (
    <Text as="p" look="bodySmall" tone="muted" verbatim>
      <span aria-hidden css={styles.reasonGlyph}>
        {glyph}
      </span>
      {children}
    </Text>
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
  /** Say that the morning report added or closed it, where nothing else on the row says so. The report's own page does not need to. */
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
  const picked = selecting && selection.isSelected(id);

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

  const facts: ReactNode[] = [];
  if (todo.waitingOn !== null && !done) {
    facts.push(
      <Badge key="waiting" size="sm" intent="info" css={styles.waitingOn}>
        <span css={truncate.base}>
          {t({ en: "Waiting on {who}", zh: "在等 {who}" }).replace(
            "{who}",
            todo.waitingOn,
          )}
        </span>
      </Badge>,
    );
    if (todo.followUpDate !== null) {
      facts.push(
        <FollowUpBadge
          key="follow-up"
          date={todo.followUpDate}
          today={today}
          locale={locale}
        />,
      );
    }
  }
  if (todo.dueDate !== null && !done) {
    facts.push(
      <DueBadge
        key="due"
        dueDate={todo.dueDate}
        started={!notStarted}
        today={today}
        locale={locale}
      />,
    );
  }
  if (todo.startDate !== null && notStarted && !done) {
    facts.push(
      <Badge key="starts" size="sm" intent="neutral">
        {t({ en: "Starts {date}", zh: "{date}开始" }).replace(
          "{date}",
          formatShortDate(todo.startDate, locale),
        )}
      </Badge>,
    );
  }
  if (
    todo.calendarSlot &&
    (!done || slotIsAhead(todo.calendarSlot, renderedAt))
  ) {
    facts.push(
      <CalendarSlotLabel
        key="slot"
        slot={todo.calendarSlot}
        stillHeld={done}
      />,
    );
  }
  if (todo.checklist.length > 0 && !done) {
    facts.push(
      <ChecklistProgress
        key="checklist"
        steps={todo.checklist}
        onOpen={
          readOnly
            ? undefined
            : () => {
                setEditing("checklist");
              }
        }
      />,
    );
  }
  if (showDoneDate && todo.doneAt !== null) {
    facts.push(
      t({ en: "Done {date}", zh: "{date}完成" }).replace(
        "{date}",
        formatShortDate(
          localClock(new Date(todo.doneAt), timeZone).date,
          locale,
        ),
      ),
    );
  }
  const origin: ReactNode[] = [];
  const reason = done ? todo.doneReason : todo.waitingNote;
  if (showSource && done && todo.doneReason) {
    origin.push(t({ en: "Closed by the morning report", zh: "由晨报关闭" }));
  } else if (
    showSource &&
    todo.createdBy === "report" &&
    !reason &&
    !todo.openHref
  ) {
    origin.push(t({ en: "From the morning report", zh: "来自晨报" }));
  }
  if (todo.reAdded) {
    origin.push(t({ en: "You deleted this before", zh: "你之前删过" }));
  }
  if (todo.openHref) {
    origin.push(<OpenMailLink key="mail" href={todo.openHref} />);
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
        selecting && selected.marked,
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
            checked={picked}
            look="selection"
            onChange={() => {
              selection.pick(id, false);
            }}
          />
        ) : (
          <TickBox
            label={todo.title}
            checked={done}
            readOnly={readOnly}
            look="done"
            onChange={(checked) => {
              setDone(id, checked);
            }}
          />
        )}
        <div css={styles.main}>
          {done ? (
            <Text as="p" tone="muted" verbatim>
              {todo.title}
            </Text>
          ) : readOnly ? (
            <Text as="p" verbatim>
              {todo.title}
            </Text>
          ) : (
            <button
              type="button"
              css={[
                buttonReset.base,
                typeRole.body,
                typeModifier.verbatim,
                styles.title,
              ]}
              onClick={() => {
                setEditing("title");
              }}
            >
              {todo.title}
            </button>
          )}
          {selecting || (readOnly && !sortable?.handle) ? null : (
            <div css={[typeRole.body, styles.actions]}>
              {sortable?.handle ? (
                <span css={styles.handle}>{sortable.handle}</span>
              ) : null}
              {readOnly ? null : (
                <TodoRowMenu
                  todo={todo}
                  moves={sortable?.moves}
                  onEdit={setEditing}
                />
              )}
            </div>
          )}
          <div css={[stack.text, styles.wide]}>
            {todo.detail ? (
              <NoteText text={todo.detail} clamped={!done && !readOnly} />
            ) : null}
            {reason ? (
              <ReasonLine
                glyph={
                  done ? (
                    <CheckCircleIcon weight="regular" />
                  ) : todo.waitingOn === null ? (
                    <ArrowUUpLeftIcon weight="regular" />
                  ) : (
                    <HourglassIcon weight="regular" />
                  )
                }
              >
                {reason}
              </ReasonLine>
            ) : null}
            {facts.length + origin.length > 0 ? (
              <Text as="div" look="caption" tone="muted" css={styles.meta}>
                <MetaLine
                  facts={[
                    ...facts,
                    origin.length > 0 ? (
                      <MetaLine key="origin" facts={origin} />
                    ) : null,
                  ]}
                />
              </Text>
            ) : null}
          </div>
        </div>
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
  row: {
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  main: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "start",
    flexGrow: 1,
    minInlineSize: 0,
  },
  title: {
    textAlign: "start",
    color: color.foreground,
  },
  wide: {
    gridColumn: "1 / -1",
  },
  meta: {
    marginBlockStart: rhythm.inline,
  },
  waitingOn: {
    maxInlineSize: "100%",
  },
  reasonGlyph: {
    display: "inline-flex",
    alignItems: "center",
    blockSize: "1lh",
    verticalAlign: "top",
    marginInlineEnd: rhythm.inline,
  },
  // On a small touch screen, the title gets the space. The row menu can move the row.
  handle: {
    display: {
      default: "flex",
      [pointer.coarse]: { default: "none", [breakpoints.md]: "flex" },
    },
  },
  actions: {
    gridColumn: 2,
    gridRow: 1,
    display: "flex",
    alignItems: "center",
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
    marginInlineStart: rhythm.inline,
  },
});
