"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { BookmarkSimpleIcon } from "@phosphor-icons/react/dist/ssr/BookmarkSimple";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { NotePencilIcon } from "@phosphor-icons/react/dist/ssr/NotePencil";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { row } from "@tuja/ui/primitives/stack.stylex";
import type {
  SegmentFailure,
  TripAssistantModel,
} from "./use-trip-assistant.ts";

/** What the panel or the sheet of the assistant shows. */
export type AssistantScreen =
  | { name: "conversation" }
  | { name: "history" }
  | { name: "segment"; id: string }
  | { name: "memory" };

export function useSegmentFailureWords(): Record<SegmentFailure, string> {
  return {
    busy: t({
      en: "The assistant is still answering. Try again when it is done.",
      zh: "助手还在回答，请等它答完再试。",
    }),
    request_failed: t({
      en: "That did not go through. Try again.",
      zh: "操作没有成功，请再试一次。",
    }),
  };
}

export function useScreenTitle(screen: AssistantScreen): string {
  const titles = {
    conversation: t({ en: "Trip assistant", zh: "行程助手" }),
    history: t({ en: "Earlier conversations", zh: "以前的对话" }),
    segment: t({ en: "Earlier conversation", zh: "以前的对话" }),
    memory: t({
      en: "What the assistant remembers",
      zh: "助手记住的内容",
    }),
  };
  return titles[screen.name];
}

/** The way back from a screen to the conversation, or to the list it came from. */
export function BackButton({
  screen,
  onScreen,
}: {
  screen: AssistantScreen;
  onScreen: (screen: AssistantScreen) => void;
}) {
  const toList = screen.name === "segment";
  return (
    <Button
      size="sm"
      look="ghost"
      aria-label={
        toList
          ? t({ en: "Back to earlier conversations", zh: "返回以前的对话" })
          : t({ en: "Back to the conversation", zh: "返回对话" })
      }
      icon={<ArrowLeftIcon weight="bold" />}
      onClick={() => {
        onScreen(toList ? { name: "history" } : { name: "conversation" });
      }}
    />
  );
}

/** What the person can do with the conversation as a whole. */
export function ConversationEntries({
  model,
  onScreen,
  labelled,
}: {
  model: TripAssistantModel;
  onScreen: (screen: AssistantScreen) => void;
  /** Shows the words beside the icons, where there is room. */
  labelled: boolean;
}) {
  const isEmpty = model.transcript.length === 0;
  const entries = [
    {
      key: "new",
      label: t({ en: "New conversation", zh: "新对话" }),
      short: t({ en: "New", zh: "新对话" }),
      icon: <NotePencilIcon weight="bold" />,
      disabled: isEmpty || model.isRunning || model.switching !== null,
      loading: model.switching === "new",
      onClick: () => {
        void model.startNew();
      },
    },
    {
      key: "history",
      label: t({ en: "Earlier conversations", zh: "以前的对话" }),
      short: t({ en: "Earlier", zh: "以前的对话" }),
      icon: <ClockCounterClockwiseIcon weight="bold" />,
      disabled: false,
      loading: false,
      onClick: () => {
        onScreen({ name: "history" });
      },
    },
    {
      key: "memory",
      label: t({
        en: "What the assistant remembers",
        zh: "助手记住的内容",
      }),
      short: t({ en: "Remembered", zh: "记住的内容" }),
      icon: <BookmarkSimpleIcon weight="bold" />,
      disabled: false,
      loading: false,
      onClick: () => {
        onScreen({ name: "memory" });
      },
    },
  ];
  return (
    <div css={row.tight}>
      {entries.map((entry) => (
        <Button
          key={entry.key}
          size="sm"
          look="ghost"
          icon={entry.icon}
          aria-label={labelled ? undefined : entry.label}
          title={entry.label}
          disabled={entry.disabled}
          loading={entry.loading}
          onClick={entry.onClick}
        >
          {labelled ? entry.short : undefined}
        </Button>
      ))}
    </div>
  );
}
