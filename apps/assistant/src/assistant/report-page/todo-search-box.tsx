"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { TextField } from "@tuja/ui/components/text-field";
import type { StyleProp } from "@tuja/ui/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { todoLimits } from "../report/todo-limits.ts";

const TYPING_PAUSE_MS = 250;

/**
 * The search of the to-dos. The text goes in the address, and the server gives
 * the rows of that address. It waits for a pause in the typing, and for the end
 * of IME composition, because pinyin that is not yet a word finds nothing.
 */
export function TodoSearchBox({
  query,
  found,
  hasMore,
  css,
}: {
  /** The text that the shown rows are for. */
  query: string;
  found: number;
  hasMore: boolean;
  css?: StyleProp;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [text, setText] = useState(query);
  const [sent, setSent] = useState(query);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  return (
    <form
      role="search"
      css={css}
      onSubmit={(event) => {
        event.preventDefault();
        send(text);
      }}
    >
      <TextField
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        label={t({ en: "Search to-dos", zh: "搜索待办" })}
        labelHidden
        placeholder={t({ en: "Search all", zh: "搜索全部待办" })}
        leading={<MagnifyingGlassIcon weight="bold" />}
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
          if (!(nativeEvent instanceof InputEvent && nativeEvent.isComposing)) {
            sendAfterPause(event.target.value);
          }
        }}
        onCompositionEnd={(event) => {
          sendAfterPause(event.currentTarget.value);
        }}
      />
    </form>
  );
}
