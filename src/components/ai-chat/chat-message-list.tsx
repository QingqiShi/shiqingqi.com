"use client";

import * as stylex from "@stylexjs/stylex";
import type { ChatStatus, UIMessage } from "ai";
import { type ReactNode, useEffect, useState } from "react";
import { flex } from "#src/primitives/flex.stylex.ts";
import { space } from "#src/tokens.stylex.ts";
import { ChatMessage } from "./chat-message";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import { TypingIndicator } from "./typing-indicator";

const SCROLL_THRESHOLD = 50;

interface ChatMessageListProps {
  messages: ReadonlyArray<UIMessage>;
  status: ChatStatus;
  emptyState: ReactNode;
  typingIndicatorLabel: string;
  scrollToBottomLabel: string;
}

export function ChatMessageList({
  messages,
  status,
  emptyState,
  typingIndicatorLabel,
  scrollToBottomLabel,
}: ChatMessageListProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
    setIsAtBottom(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      const { scrollHeight } = document.documentElement;
      const atBottom =
        scrollHeight - window.scrollY - window.innerHeight < SCROLL_THRESHOLD;
      setIsAtBottom(atBottom);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const lastMessageRole =
    messages.length > 0 ? messages[messages.length - 1]?.role : undefined;

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottom || lastMessageRole === "user") {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
  }, [messages.length, lastMessageRole, isAtBottom]);

  const showTypingIndicator = status === "submitted";

  return (
    <div css={[flex.col, styles.container]}>
      {messages.length === 0 ? (
        <div css={styles.emptyStateWrapper}>{emptyState}</div>
      ) : (
        <div role="log" css={[flex.col, styles.messagesList]}>
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                status === "streaming" &&
                message.role === "assistant" &&
                index === messages.length - 1
              }
            />
          ))}
          {showTypingIndicator && (
            <TypingIndicator label={typingIndicatorLabel} />
          )}
        </div>
      )}
      <ScrollToBottomButton
        visible={!isAtBottom && messages.length > 0}
        label={scrollToBottomLabel}
        onClick={scrollToBottom}
      />
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
});
