"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { color, controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";
import { daysBetween, formatShortDate } from "./format-day.ts";
import { OpenMailButton } from "./open-mail-button.tsx";
import { TodosReadOnlyContext } from "./todos-read-only.tsx";

export interface TodoItemData {
  id: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  done: boolean;
  openHref: string | null;
}

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
 * One to-do with a box to tick it off. The row stays where it is once
 * ticked, with an undo, until the page loads again.
 */
export function TodoItem({
  todo,
  today,
  locale,
}: {
  todo: TodoItemData;
  /** The user's local date, `YYYY-MM-DD`, for the due date. */
  today: string;
  locale: string;
}) {
  const readOnly = use(TodosReadOnlyContext);
  const router = useRouter();
  const [override, setOverride] = useState<boolean | null>(null);
  const done = override ?? todo.done;
  const [justDone, setJustDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastSaveRef = useRef<Promise<unknown> | null>(null);

  // The router keeps pages from before a tick, and a refresh clears them. The
  // row must stay until the page loads again, so the refresh waits until the
  // row goes away. A refresh before the save lands reads the old data, so it
  // also waits for the save, which can land after the row has gone.
  useEffect(
    () => () => {
      if (lastSaveRef.current === null) return;
      refreshAfterSave(lastSaveRef.current, () => {
        router.refresh();
      });
    },
    [router],
  );

  function save(next: boolean) {
    const previous = override;
    setBusy(true);
    setFailed(false);
    setOverride(next);
    setJustDone(next);
    lastSaveRef.current = assistantFetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: next }),
    })
      .catch(() => {
        setOverride(previous);
        setJustDone(false);
        setFailed(true);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  return (
    <li css={listSurface.item}>
      <div
        css={[
          listSurface.row,
          styles.row,
          todo.openHref !== null && styles.rowWithMail,
        ]}
      >
        <div css={[stack.text, styles.main]}>
          <Checkbox
            label={todo.title}
            checked={done}
            disabled={busy || readOnly}
            onChange={(event) => {
              save(event.target.checked);
            }}
            css={done && styles.done}
          />
          {todo.detail ? (
            <Text as="p" look="bodySmall" tone="muted" css={styles.indent}>
              {todo.detail}
            </Text>
          ) : null}
          <div css={[cluster.inline, styles.indent]}>
            {justDone ? (
              <Button
                size="sm"
                look="ghost"
                disabled={busy}
                onClick={() => {
                  save(false);
                }}
              >
                {t({ en: "Undo", zh: "撤销" })}
              </Button>
            ) : null}
            <span role="status">
              {failed ? (
                <Text look="caption" css={styles.failed}>
                  {t({
                    en: "That did not save. Try again.",
                    zh: "没有保存成功，请重试。",
                  })}
                </Text>
              ) : null}
            </span>
          </div>
        </div>
        {todo.dueDate !== null && !done ? (
          <div css={styles.due}>
            <DueBadge dueDate={todo.dueDate} today={today} locale={locale} />
          </div>
        ) : null}
        {todo.openHref ? (
          <div css={styles.open}>
            <OpenMailButton href={todo.openHref} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

const INDENT = `calc(${controlSize._5} + ${controlSize._2})`;

const styles = stylex.create({
  // Below `md`, the due date goes under the detail. From `md`, it goes at the
  // end of the row, before the button that opens the mail.
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "minmax(0, 1fr) auto",
    },
    rowGap: rhythm.inline,
    paddingBlock: space._2,
  },
  rowWithMail: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto",
      [breakpoints.md]: "minmax(0, 1fr) auto auto",
    },
  },
  main: {
    gridColumn: 1,
    gridRow: 1,
  },
  due: {
    gridColumn: { default: 1, [breakpoints.md]: 2 },
    gridRow: { default: 2, [breakpoints.md]: 1 },
    paddingInlineStart: { default: INDENT, [breakpoints.md]: 0 },
  },
  open: {
    gridColumn: { default: 2, [breakpoints.md]: 3 },
    gridRow: { default: "1 / span 2", [breakpoints.md]: 1 },
  },
  done: {
    [color.fg]: color.fgMuted,
    textDecorationLine: "line-through",
  },
  indent: {
    paddingInlineStart: INDENT,
  },
  failed: {
    color: color.fgDanger,
    paddingInline: rhythm.tight,
  },
});
