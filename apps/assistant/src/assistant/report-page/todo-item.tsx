"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  color,
  controlSize,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { daysBetween, formatShortDate } from "./format-day.ts";

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
  const [done, setDone] = useState(todo.done);
  const [justDone, setJustDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const isWeb = todo.openHref?.startsWith("https:") ?? false;

  function save(next: boolean) {
    setBusy(true);
    setFailed(false);
    setDone(next);
    setJustDone(next);
    assistantFetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: next }),
    })
      .catch(() => {
        setDone(!next);
        setJustDone(false);
        setFailed(true);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  const hasMeta =
    todo.openHref !== null ||
    (todo.dueDate !== null && !done) ||
    justDone ||
    failed;

  return (
    <li css={[stack.tight, styles.item]}>
      <Checkbox
        label={todo.title}
        checked={done}
        disabled={busy}
        onChange={(event) => {
          save(event.target.checked);
        }}
        css={done && styles.done}
      />
      {todo.detail || hasMeta ? (
        <div css={[stack.tight, styles.indent]}>
          {todo.detail ? (
            <Text as="p" look="bodySmall" tone="muted">
              {todo.detail}
            </Text>
          ) : null}
          {hasMeta ? (
            <div css={styles.meta}>
              {todo.dueDate !== null && !done ? (
                <DueBadge
                  dueDate={todo.dueDate}
                  today={today}
                  locale={locale}
                />
              ) : null}
              {todo.openHref ? (
                <AnchorButton
                  href={todo.openHref}
                  size="sm"
                  look="ghost"
                  icon={<ArrowSquareOutIcon weight="bold" />}
                  {...(isWeb ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {t({ en: "Open mail", zh: "打开原邮件" })}
                </AnchorButton>
              ) : null}
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
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const styles = stylex.create({
  item: {
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  done: {
    color: color.fgMuted,
    textDecorationLine: "line-through",
    textDecorationColor: color.border,
  },
  indent: {
    paddingInlineStart: `calc(${controlSize._5} + ${controlSize._2})`,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: rhythm.inline,
    rowGap: rhythm.inline,
  },
  failed: {
    color: color.fgDanger,
    paddingInline: rhythm.tight,
  },
});
