"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import { use, useState, type ReactNode } from "react";
import { daysBetween, formatShortDate } from "./format-day.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import { TodoEditor, type TodoEditFocus } from "./todo-editor.tsx";
import { TodoRowMenu } from "./todo-row-menu.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";
import { TodosReadOnlyContext } from "./todos-read-only.tsx";

function DueBadge({
  dueDate,
  today,
  locale,
}: {
  dueDate: string;
  today: string;
  locale: string;
}) {
  const days = daysBetween(today, dueDate);
  const date = formatShortDate(dueDate, locale);
  return (
    <Badge size="sm" intent={days <= 1 ? "warning" : "neutral"}>
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

/**
 * One to-do: a box to tick it off, its title, which opens its editor in place,
 * and a menu for all else. It shows `fallback` once the to-do is deleted.
 */
export function TodoItem({
  id,
  showSource = false,
  fallback = null,
}: {
  id: string;
  /** Say that the morning report added it. The report's own page does not need to. */
  showSource?: boolean;
  fallback?: ReactNode;
}) {
  const readOnly = use(TodosReadOnlyContext);
  const { rows, today, locale, setDone } = useTodoStore();
  const [editing, setEditing] = useState<TodoEditFocus | null>(null);
  const todo = rows.find((row) => row.id === id);
  if (!todo) return fallback;
  const done = todo.doneAt !== null;

  if (editing && !done) {
    return (
      <TodoEditor
        todo={todo}
        focus={editing}
        onClose={() => {
          setEditing(null);
        }}
      />
    );
  }

  return (
    <li css={listSurface.item}>
      <div css={[listSurface.row, styles.row]}>
        {/* A tap around the box counts as a tap on the box, because a hidden
            label leaves it too small for a finger. */}
        <div
          css={[a11y.touchTarget, styles.box]}
          onClick={(event) => {
            if (event.target === event.currentTarget && !readOnly) {
              setDone(id, !done);
            }
          }}
        >
          <Checkbox
            label={todo.title}
            labelHidden
            checked={done}
            disabled={readOnly}
            onChange={(event) => {
              setDone(id, event.target.checked);
            }}
          />
        </div>
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
              <DueBadge dueDate={todo.dueDate} today={today} locale={locale} />
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
          {readOnly ? null : <TodoRowMenu todo={todo} onEdit={setEditing} />}
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
  box: {
    display: "flex",
    flexShrink: 0,
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
