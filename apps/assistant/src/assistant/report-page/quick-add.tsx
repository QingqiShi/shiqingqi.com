"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { todoLimits } from "../report/todo-limits.ts";
import { formatListDay } from "./format-day.ts";
import { parseTodoDate } from "./parse-todo-date.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

/**
 * The input at the top of the to-dos. Enter adds a to-do and keeps the focus
 * here for the next one. A date in the text shows as a chip while typing, and
 * dropping the chip keeps the text as it is. Text with no date takes the date of
 * the view it is added from, as a chip too, so the new to-do stays in sight.
 * What another app shared starts in
 * it, and goes from the address so that a reload does not bring it back.
 */
export function QuickAdd({
  sharedText = "",
  defaultDueDate,
  onAdded,
}: {
  sharedText?: string;
  /** The due date of text that names none: today in the Today view. */
  defaultDueDate: string | null;
  onAdded: (todo: {
    id: string;
    dueDate: string | null;
    startDate: null;
  }) => void;
}) {
  const { add, today, locale } = useTodoStore();
  const [text, setText] = useState(sharedText);
  const [droppedWords, setDroppedWords] = useState<string | null>(null);
  const [droppedDefault, setDroppedDefault] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = parseTodoDate(text, today);
  const datedByWords =
    parsed.dueDate !== null && parsed.matched !== droppedWords;
  const dueDate = datedByWords
    ? parsed.dueDate
    : text.trim() === "" || parsed.matched !== null || droppedDefault
      ? null
      : defaultDueDate;
  const label = t({ en: "Add a to-do", zh: "添加待办" });

  useEffect(() => {
    if (sharedText === "") return;
    window.history.replaceState(null, "", window.location.pathname);
    const input = inputRef.current;
    input?.focus();
    input?.setSelectionRange(sharedText.length, sharedText.length);
  }, [sharedText]);

  return (
    <form
      data-todo-quick-add
      css={stack.tight}
      onSubmit={(event) => {
        event.preventDefault();
        const typed = text.trim();
        if (typed) {
          const id = add({
            title: datedByWords ? parsed.title : typed,
            dueDate,
          });
          onAdded({ id, dueDate, startDate: null });
          setText("");
          setDroppedWords(null);
          setDroppedDefault(false);
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
            placeholder={label}
            leading={<PlusIcon weight="bold" />}
            value={text}
            maxLength={todoLimits.titleChars}
            enterKeyHint="done"
            autoComplete="off"
            onChange={(event) => {
              setText(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !event.nativeEvent.isComposing) {
                event.currentTarget.blur();
              }
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
          <Button
            look="outline"
            type="button"
            size="xs"
            icon={<CalendarBlankIcon weight="bold" />}
            trailing={<XIcon weight="bold" aria-hidden />}
            aria-label={t({
              en: "Remove the date {date}",
              zh: "去掉日期 {date}",
            }).replace("{date}", formatListDay(dueDate, locale))}
            onClick={() => {
              if (parsed.matched === null) setDroppedDefault(true);
              else setDroppedWords(parsed.matched);
              inputRef.current?.focus();
            }}
          >
            {formatListDay(dueDate, locale)}
          </Button>
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
