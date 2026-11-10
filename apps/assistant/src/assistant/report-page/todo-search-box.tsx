"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "@tuja/ui/primitives/motion.stylex";
import { controlHeight, font, latinType, rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { todoLimits } from "../report/todo-limits.ts";

const TYPING_PAUSE_MS = 250;

function openLabel() {
  return t({ en: "Search to-dos", zh: "搜索待办" });
}

/** The search button before the page shows. */
export function TodoSearchBoxSkeleton() {
  return (
    <div inert css={[styles.box, styles.closed]}>
      <Button
        look="ghost"
        aria-label={openLabel()}
        icon={<MagnifyingGlassIcon weight="bold" />}
        bleed="end"
      />
    </div>
  );
}

/**
 * The search of the to-dos: a button beside the heading, which opens the
 * field. The text goes in the address, and the server gives the rows of that
 * address. It waits for a pause in the typing, and for the end of IME
 * composition, because pinyin that is not yet a word finds nothing.
 */
export function TodoSearchBox({
  query,
  found,
  hasMore,
}: {
  /** The text that the shown rows are for. */
  query: string;
  found: number;
  hasMore: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState(query);
  const [sent, setSent] = useState(query);
  const [isOpen, setIsOpen] = useState(query !== "");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const focusAfterToggleRef = useRef(false);

  useEffect(() => {
    if (!focusAfterToggleRef.current) return;
    focusAfterToggleRef.current = false;
    (isOpen ? inputRef : openRef).current?.focus();
  }, [isOpen]);

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
    },
    [],
  );

  // A link can also change the address, such as the tab of this page.
  if (!isPending && query !== sent) {
    setSent(query);
    setText(query);
    if (query !== "") setIsOpen(true);
  }

  function send(value: string) {
    clearTimeout(timerRef.current);
    const term = value.trim();
    if (term === sent) return;
    const search = term === "" ? "" : `?${new URLSearchParams({ q: term })}`;
    startTransition(() => {
      setSent(term);
      router.replace(`${getLocalePath("/todos", locale)}${search}`, {
        scroll: false,
      });
    });
  }

  function sendAfterPause(value: string) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      send(value);
    }, TYPING_PAUSE_MS);
  }

  function toggle(open: boolean) {
    focusAfterToggleRef.current = true;
    setIsOpen(open);
  }

  function close() {
    setText("");
    send("");
    toggle(false);
  }

  const answer = hasMore
    ? t({
        en: "The first {count}. Type more to find fewer.",
        zh: "这是前 {count} 项。多输入几个字可以缩小范围。",
      })
    : found === 0
      ? t({ en: "No to-do matches.", zh: "没有匹配的待办。" })
      : found === 1
        ? t({ en: "{count} to-do", zh: "{count} 项待办" })
        : t({ en: "{count} to-dos", zh: "{count} 项待办" });

  if (!isOpen) {
    return (
      <form role="search" css={[styles.box, styles.closed]}>
        <Button
          ref={openRef}
          look="ghost"
          aria-label={openLabel()}
          icon={<MagnifyingGlassIcon weight="bold" />}
          bleed="end"
          onClick={() => {
            toggle(true);
          }}
        />
      </form>
    );
  }

  return (
    <form
      role="search"
      css={[styles.box, styles.open]}
      onSubmit={(event) => {
        event.preventDefault();
        send(text);
      }}
      onBlur={(event) => {
        if (
          text.trim() === "" &&
          sent === "" &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsOpen(false);
        }
      }}
    >
      <div css={styles.field}>
        <TextField
          ref={inputRef}
          type="search"
          label={openLabel()}
          labelHidden
          placeholder={t({ en: "Search all", zh: "搜索全部待办" })}
          leading={<MagnifyingGlassIcon weight="bold" />}
          enterKeyHint="search"
          autoComplete="off"
          maxLength={todoLimits.searchChars}
          value={text}
          status={
            query !== "" && query === text.trim()
              ? answer.replace("{count}", String(found))
              : ""
          }
          onChange={(event) => {
            setText(event.target.value);
            const { nativeEvent } = event;
            if (!(
              nativeEvent instanceof InputEvent && nativeEvent.isComposing
            )) {
              sendAfterPause(event.target.value);
            }
          }}
          onCompositionEnd={(event) => {
            sendAfterPause(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              close();
            }
          }}
        />
      </div>
      <Button look="ghost" bleed="end" onClick={close}>
        {t({ en: "Cancel", zh: "取消" })}
      </Button>
    </form>
  );
}

// The field opens from the button at the end of the row. A clip path does not
// change the layout, so the field grows without a layout animation.
const reveal = stylex.keyframes({
  from: { clipPath: "inset(0 0 0 100%)", opacity: 0 },
});

const styles = stylex.create({
  box: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    gap: rhythm.inline,
    flexBasis: "10rem",
    flexGrow: 1,
    minInlineSize: 0,
  },
  // The button is taller than the heading. It must not make the line taller,
  // because the heading of each page starts at the same height.
  closed: {
    alignSelf: "center",
    alignItems: "center",
    blockSize: 0,
  },
  // The field is taller than the heading's line. It is centred on that line
  // and goes above it, so that the heading stays where it is when the field
  // opens.
  open: {
    marginBlockStart: `calc((${font.uiHeading1} * ${latinType.lineHeightHeading} - ${controlHeight.md}) / 2)`,
    animationName: {
      default: reveal,
      [motionConstants.REDUCED_MOTION]: motionKeyframes.fadeIn,
    },
    animationDuration: {
      default: duration._500,
      [motionConstants.REDUCED_MOTION]: duration._200,
    },
    animationTimingFunction: {
      default: easing.spring,
      [motionConstants.REDUCED_MOTION]: easing.ease,
    },
  },
  field: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
