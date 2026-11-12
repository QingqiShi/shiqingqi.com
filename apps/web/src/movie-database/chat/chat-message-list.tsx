"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ChatStatus, UIMessage } from "ai";
import { type ReactNode, useEffect, useEffectEvent, useRef } from "react";
import type { ToolOutputMaps } from "#src/movie-database/chat/tool-output/accumulate-tool-outputs.ts";
import { screenScrollerOf } from "#src/movie-database/screen-scroller-of.ts";
import { usePreferencePersistence } from "#src/movie-database/taste/use-preference-persistence.ts";
import { ChatMessage } from "./chat-message";
import {
  COMPACTION_TRIGGER_TOKENS,
  USAGE_WARNING_RATIO,
} from "./context-management-config.ts";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessageMetadata } from "./use-ai-chat.ts";

export const SCROLL_THRESHOLD = 50;
const USAGE_WARNING_THRESHOLD = COMPACTION_TRIGGER_TOKENS * USAGE_WARNING_RATIO;

interface ChatMessageListProps {
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>;
  status: ChatStatus;
  error: Error | undefined;
  isAtBottom: boolean;
  toolOutputs: ToolOutputMaps;
  emptyState: ReactNode;
  messagesLabel: string;
  typingIndicatorLabel: string;
  errorLabel: string;
}

function getLatestInputTokens(
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>,
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.metadata?.inputTokens != null) {
      return msg.metadata.inputTokens;
    }
  }
  return 0;
}

export function ChatMessageList({
  messages,
  status,
  error,
  isAtBottom,
  toolOutputs,
  emptyState,
  messagesLabel,
  typingIndicatorLabel,
  errorLabel,
}: ChatMessageListProps) {
  usePreferencePersistence(messages);

  const lastMessageRole =
    messages.length > 0 ? messages[messages.length - 1]?.role : undefined;
  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant",
  );

  const messagesListRef = useRef<HTMLDivElement | null>(null);

  // Reads the latest isAtBottom without needing it in effect dep arrays —
  // changing scroll position should not restart the ResizeObserver or
  // re-trigger the message-length scroll effect.
  const scrollToBottom = () => {
    const scroller = screenScrollerOf(messagesListRef.current);
    scroller.scrollTo({ top: scroller.scrollHeight });
  };
  const scrollToBottomIfNeeded = useEffectEvent(() => {
    if (isAtBottom) scrollToBottom();
  });
  const scrollToBottomNow = useEffectEvent(scrollToBottom);

  useEffect(() => {
    if (messages.length === 0) return;
    if (lastMessageRole === "user") {
      scrollToBottomNow();
    } else {
      scrollToBottomIfNeeded();
    }
  }, [messages.length, lastMessageRole]);

  useEffect(() => {
    if (status !== "streaming") return;
    if (typeof ResizeObserver === "undefined") return;
    const el = messagesListRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      scrollToBottomIfNeeded();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [status]);

  const showTypingIndicator = status === "submitted" || status === "streaming";
  const isTypingIndicatorExiting = status !== "submitted";
  const showError = status === "error" && error != null;
  const latestInputTokens = getLatestInputTokens(messages);
  const showUsageWarning = latestInputTokens >= USAGE_WARNING_THRESHOLD;

  return (
    <div css={[flex.col, styles.container]}>
      {messages.length === 0 ? (
        <div css={styles.emptyStateWrapper}>{emptyState}</div>
      ) : (
        <div
          ref={messagesListRef}
          role="log"
          aria-live={status === "streaming" ? "off" : "polite"}
          aria-label={messagesLabel}
          css={stack.item}
        >
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                status === "streaming" &&
                message.role === "assistant" &&
                index === messages.length - 1
              }
              isLastAssistantMessage={
                message.role === "assistant" && index === lastAssistantIndex
              }
              toolOutputs={toolOutputs}
            />
          ))}
          {showTypingIndicator && (
            <TypingIndicator
              label={typingIndicatorLabel}
              isExiting={isTypingIndicatorExiting}
            />
          )}
          {showError && (
            <Callout intent="destructive" role="alert">
              {errorLabel}
            </Callout>
          )}
        </div>
      )}
      {showUsageWarning && (
        <Callout intent="warning" role="status">
          {t({
            en: "The conversation is getting lengthy",
            zh: "对话越来越长",
          })}
        </Callout>
      )}
    </div>
  );
}

const styles = stylex.create({
  container: {
    flexGrow: 1,
    paddingBlock: space._3,
  },
  emptyStateWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    flexGrow: 1,
    paddingTop: space._8,
  },
});
