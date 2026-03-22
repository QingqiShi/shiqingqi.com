"use client";

import * as stylex from "@stylexjs/stylex";
import type { ChatStatus, UIMessage } from "ai";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    }
    setIsAtBottom(true);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
      setIsAtBottom(atBottom);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const lastMessageRole =
    messages.length > 0 ? messages[messages.length - 1]?.role : undefined;

  useEffect(() => {
    if (messages.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    if (isAtBottom || lastMessageRole === "user") {
      el.scrollTo?.({ top: el.scrollHeight });
    }
  }, [messages.length, lastMessageRole, isAtBottom]);

  const showTypingIndicator = status === "submitted";

  return (
    <div ref={scrollRef} css={styles.container}>
      {messages.length === 0 ? (
        <div css={styles.emptyStateWrapper}>{emptyState}</div>
      ) : (
        <div css={styles.messagesList}>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
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
    display: "flex",
    flexDirection: "column",
    padding: space._3,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  },
  emptyStateWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  messagesList: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
});
