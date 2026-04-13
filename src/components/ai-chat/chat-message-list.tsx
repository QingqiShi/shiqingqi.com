"use client";

import * as stylex from "@stylexjs/stylex";
import type { ChatStatus, UIMessage } from "ai";
import { type ReactNode, useEffect, useEffectEvent, useRef } from "react";
import {
  COMPACTION_TRIGGER_TOKENS,
  USAGE_WARNING_RATIO,
} from "#src/ai-chat/context-management-shared.ts";
import type { ChatMessageMetadata } from "#src/ai-chat/use-ai-chat.ts";
import { t } from "#src/i18n.ts";
import { usePreferencePersistence } from "#src/preference-store/use-preference-persistence.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import { ChatMessage } from "./chat-message";
import type { ToolOutputMaps } from "./map-tool-output";
import { TypingIndicator } from "./typing-indicator";

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
  const scrollToBottomIfNeeded = useEffectEvent(() => {
    if (isAtBottom) {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
  });

  useEffect(() => {
    if (messages.length === 0) return;
    if (lastMessageRole === "user") {
      window.scrollTo({ top: document.documentElement.scrollHeight });
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
          css={[flex.col, styles.messagesList]}
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
            <p css={styles.errorMessage} role="alert">
              {errorLabel}
            </p>
          )}
        </div>
      )}
      {showUsageWarning && (
        <p css={styles.usageWarning}>
          {t({
            en: "The conversation is getting lengthy",
            zh: "对话越来越长",
          })}
        </p>
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
  messagesList: {
    gap: space._2,
  },
  usageWarning: {
    margin: 0,
    textAlign: "center",
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    paddingBlock: space._1,
  },
  errorMessage: {
    margin: 0,
    textAlign: "center",
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
    paddingBlock: space._2,
  },
});
