"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Chip } from "@tuja/ui/components/chip";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useRef, useState } from "react";
import { todoLimits } from "../report/todo-limits.ts";
import { formatListDay } from "./format-day.ts";
import { parseTodoDate } from "./parse-todo-date.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/**
 * The input at the top of the to-dos. Enter adds a to-do and keeps the focus
 * here for the next one. A date in the text shows as a chip while typing, and
 * dropping the chip keeps the text as it is.
 */
export function QuickAdd({
  onAdded,
}: {
  onAdded: (todo: { dueDate: string | null; startDate: null }) => void;
}) {
  const { add, today, locale } = useTodoStore();
  const [text, setText] = useState("");
  const [droppedWords, setDroppedWords] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = parseTodoDate(text, today);
  const dueDate = parsed.matched === droppedWords ? null : parsed.dueDate;
  const label = t({ en: "Add a to-do", zh: "添加待办" });

  return (
    <form
      css={stack.tight}
      onSubmit={(event) => {
        event.preventDefault();
        const typed = text.trim();
        if (typed) {
          add({ title: dueDate ? parsed.title : typed, dueDate });
          onAdded({ dueDate, startDate: null });
          setText("");
          setDroppedWords(null);
        }
        inputRef.current?.focus();
      }}
    >
      <div css={styles.line}>
        <div css={styles.field}>
          <TextField
            ref={inputRef}
            label={label}
            labelHidden
            placeholder={t({
              en: "Send the report by Friday",
              zh: "周五前交报销",
            })}
            value={text}
            maxLength={todoLimits.titleChars}
            enterKeyHint="done"
            autoComplete="off"
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </div>
        <Button
          type="submit"
          look="outline"
          disabled={!text.trim()}
          css={styles.submit}
        >
          {t({ en: "Add", zh: "添加" })}
        </Button>
      </div>
      <div aria-live="polite">
        {dueDate ? (
          <Chip
            type="button"
            size="xs"
            icon={<CalendarBlankIcon weight="bold" />}
            trailing={<XIcon weight="bold" aria-hidden />}
            aria-label={t({
              en: "Remove the date {date}",
              zh: "去掉日期 {date}",
            }).replace("{date}", formatListDay(dueDate, locale))}
            onClick={() => {
              setDroppedWords(parsed.matched);
              inputRef.current?.focus();
            }}
          >
            {formatListDay(dueDate, locale)}
          </Chip>
        ) : null}
      </div>
    </form>
  );
}

const styles = stylex.create({
  line: {
    display: "flex",
    alignItems: "flex-start",
    gap: rhythm.tight,
  },
  field: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  submit: {
    flexShrink: 0,
  },
});
