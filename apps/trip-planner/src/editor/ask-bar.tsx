"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Spinner } from "@tuja/ui/components/spinner";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { dayAnchorId } from "#src/reader/use-trip-location.ts";
import { AppToasts } from "#src/shell/app-toasts.tsx";
import type { Trip } from "#src/trips/types.ts";
import { useAsk, type AskFailure } from "./ask-provider.tsx";
import { useEditor } from "./editor-provider.tsx";

/** The row that the sheet of a proposal grows from. */
export const ASK_ROW = "ask";

/** Takes the height of the prompt in px, or 0 when it does not show. */
const BarHeightContext = createContext<((height: number) => void) | null>(null);

/** The day whose part of the outline is at the top of the screen. */
function dayOnScreen(trip: Trip): string | undefined {
  const line = window.innerHeight / 3;
  const shown = trip.days.findLast((_, index) => {
    const section = document.getElementById(dayAnchorId(index));
    return section !== null && section.getBoundingClientRect().top <= line;
  });
  return (shown ?? trip.days.at(0))?.id;
}

function useFailureWords(): Record<AskFailure, string> {
  return {
    nothing: t({
      en: "No change came back that fits this trip. Say it another way, or ask for less at a time.",
      zh: "没有得到适用于这个行程的修改。换个说法，或者一次少改一些。",
    }),
    slow: t({
      en: "The answer took too long. Ask for less at a time.",
      zh: "等待回答的时间太长了。试着一次少改一些。",
    }),
    unavailable: t({
      en: "AI is not set up for this app.",
      zh: "这里暂时无法使用 AI。",
    }),
    gone: t({
      en: "You can no longer change this trip.",
      zh: "你已无法修改这个行程。",
    }),
    long: t({
      en: "That is too long. Keep it under 4,000 characters.",
      zh: "内容太长了，请控制在 4000 字以内。",
    }),
    failed: t({
      en: "The request did not go through. Try again.",
      zh: "请求没有发送成功，请再试一次。",
    }),
  };
}

/**
 * The prompt at the bottom of the edit screen: the person asks for changes
 * in their own words. It stays above the tab bar while the outline scrolls
 * under it, and it says what the request does: it runs, it failed, or its
 * changes wait for a decision.
 */
export function AskBar({
  isReviewing,
  onReview,
}: {
  /** Whether the sheet shows the proposal now. */
  isReviewing: boolean;
  onReview: () => void;
}) {
  const ask = useAsk();
  const editor = useEditor();
  const failureWords = useFailureWords();
  const label = t({ en: "Ask for a change", zh: "用一句话修改行程" });
  const waitsOne = t({
    en: "1 proposed change waits",
    zh: "有 1 项修改建议待处理",
  });
  const waitsMany = t({
    en: "{count} proposed changes wait",
    zh: "有 {count} 项修改建议待处理",
  });
  const unfitOne = t({
    en: "1 proposed change no longer fits the trip",
    zh: "有 1 项修改建议已不适用于现在的行程",
  });
  const unfitMany = t({
    en: "{count} proposed changes no longer fit the trip",
    zh: "有 {count} 项修改建议已不适用于现在的行程",
  });
  // The offer to review stays while a batch has no decision, also when the
  // trip cannot take it: the sheet says why.
  const [waits, one, many] =
    ask.open.length > 0
      ? [ask.open.length, waitsOne, waitsMany]
      : [ask.stale.length, unfitOne, unfitMany];

  const { isGone } = editor.state;
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const setBarHeight = use(BarHeightContext);
  // The prompt grows with its text and its status, and the toasts stay
  // above it.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field || !setBarHeight) return;
    const observer = new ResizeObserver(() => {
      setBarHeight(field.offsetHeight);
    });
    observer.observe(field);
    return () => {
      observer.disconnect();
      setBarHeight(0);
    };
  }, [setBarHeight, isGone]);

  if (isGone) return null;

  const status = (words: ReactNode, action?: ReactNode) => (
    <div css={[row.tight, styles.status]}>
      <div css={styles.words}>{words}</div>
      {action}
    </div>
  );
  const header = ask.isAsking
    ? status(
        <span role="status" css={row.tight}>
          <Spinner size="sm" aria-hidden />
          <Text as="span" look="bodySmall" tone="muted">
            {t({ en: "Working out the changes…", zh: "正在想怎么改…" })}
          </Text>
        </span>,
        <Button type="button" size="sm" look="ghost" onClick={ask.cancel}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>,
      )
    : !editor.isOnline
      ? status(
          <Text look="bodySmall" tone="muted">
            {t({
              en: "You are offline. Asking comes back with the connection.",
              zh: "你现在处于离线状态，恢复连接后才能提问。",
            })}
          </Text>,
        )
      : ask.failure
        ? status(
            <div role="alert">
              <Text look="bodySmall" tone="destructive">
                {failureWords[ask.failure]}
              </Text>
            </div>,
          )
        : waits > 0 && !isReviewing
          ? status(
              <Text look="bodySmall" tone="muted">
                {waits === 1 ? one : many.replace("{count}", String(waits))}
              </Text>,
              <Button type="button" size="sm" onClick={onReview}>
                {t({ en: "Review", zh: "查看" })}
              </Button>,
            )
          : undefined;

  const hasWords = ask.prompt.trim().length > 0;
  return (
    <StickyControls css={styles.bar}>
      <StickyControlGroup css={styles.fill}>
        <div
          ref={(element) => {
            fieldRef.current = element;
            editor.rowRef(ASK_ROW)(element);
          }}
          css={styles.fill}
        >
          <PromptField
            label={label}
            placeholder={label}
            value={ask.prompt}
            onValueChange={ask.setPrompt}
            onSubmit={() => {
              ask.send(dayOnScreen(editor.trip));
            }}
            multiline
            disabled={ask.isAsking || !editor.isOnline}
            header={header}
            action={
              <Button
                type="submit"
                size="sm"
                look={hasWords ? "primary" : undefined}
                aria-label={t({ en: "Send", zh: "发送" })}
                disabled={!hasWords || ask.isAsking || !editor.isOnline}
                icon={<ArrowUpIcon weight="bold" role="presentation" />}
              />
            }
          />
        </div>
      </StickyControlGroup>
    </StickyControls>
  );
}

/** The toasts of the edit screen. They show above the prompt. */
export function EditorToasts({ children }: { children: ReactNode }) {
  const [barHeight, setBarHeight] = useState(0);
  return (
    <BarHeightContext value={setBarHeight}>
      <AppToasts css={barHeight > 0 && styles.toasts(barHeight)}>
        {children}
      </AppToasts>
    </BarHeightContext>
  );
}

// The place of the accessory of a column of a `NavigationSplitView`: above
// the tab bar below 34rem, and above the safe area from 34rem up.
const BAR_INSET = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // Safari on iOS takes the colour of its toolbar from a sticky box at the
  // bottom edge of the screen that is as wide as the screen. The bar stops
  // clear of that edge, and it is narrower than nine tenths of the screen.
  bar: {
    insetBlockStart: "auto",
    insetBlockEnd: BAR_INSET,
    alignSelf: "center",
    inlineSize: "100%",
    maxInlineSize: "89vw",
    // A toast over the bar leaves the last row of the screen clear.
    marginBlockStart: rhythm.group,
  },
  fill: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  status: {
    justifyContent: "space-between",
    minBlockSize: controlHeight.sm,
  },
  words: {
    minInlineSize: 0,
  },
  toasts: (barHeight: number) => ({
    [toastTokens.clearance]: `calc(${BAR_INSET} + ${String(barHeight)}px)`,
  }),
});
