"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { useAIChat } from "#src/ai-chat/use-ai-chat.ts";
import { ChatInputBar } from "#src/components/ai-chat/chat-input-bar.tsx";
import { ChatMessageList } from "#src/components/ai-chat/chat-message-list.tsx";
import { border, color, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";

interface AIChatViewProps {
  locale: SupportedLocale;
  emptyState: ReactNode;
  typingIndicatorLabel: string;
  scrollToBottomLabel: string;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
}

export function AIChatView({
  locale,
  emptyState,
  typingIndicatorLabel,
  scrollToBottomLabel,
  placeholder,
  sendLabel,
  stopLabel,
}: AIChatViewProps) {
  const { messages, status, sendMessage, stop } = useAIChat({ locale });

  return (
    <>
      <ChatMessageList
        messages={messages}
        status={status}
        emptyState={emptyState}
        typingIndicatorLabel={typingIndicatorLabel}
        scrollToBottomLabel={scrollToBottomLabel}
      />
      <div css={styles.inputArea}>
        <ChatInputBar
          placeholder={placeholder}
          sendLabel={sendLabel}
          stopLabel={stopLabel}
          status={status}
          onSend={(text) => {
            void sendMessage({ text });
          }}
          onStop={stop}
        />
      </div>
    </>
  );
}

const styles = stylex.create({
  inputArea: {
    flexShrink: 0,
    padding: space._3,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    backgroundColor: color.backgroundMain,
  },
});
