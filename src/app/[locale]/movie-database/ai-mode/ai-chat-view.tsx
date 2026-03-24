"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { useAIChat } from "#src/ai-chat/use-ai-chat.ts";
import { ChatActionsContext } from "#src/components/ai-chat/chat-actions-context.tsx";
import { ChatInputBar } from "#src/components/ai-chat/chat-input-bar.tsx";
import { ChatMessageList } from "#src/components/ai-chat/chat-message-list.tsx";
import { border, color, layer, space } from "#src/tokens.stylex.ts";
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

  const handleSend = (text: string) => {
    void sendMessage({ text });
  };

  return (
    <ChatActionsContext value={{ sendMessage: handleSend }}>
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
          onSend={handleSend}
          onStop={stop}
        />
      </div>
    </ChatActionsContext>
  );
}

/**
 * Horizontal inset from viewport edge to content inside ChatMessageList.
 * Padding chain: layout (space._3 + safe-area) + ChatMessageList (space._3).
 * See also: recommended-media-row.tsx which uses the same offsets.
 */
const contentInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const contentInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;
const layoutInsetLeft = `calc(${space._3} + env(safe-area-inset-left, 0px))`;
const layoutInsetRight = `calc(${space._3} + env(safe-area-inset-right, 0px))`;

const styles = stylex.create({
  inputArea: {
    position: "sticky",
    bottom: 0,
    flexShrink: 0,
    zIndex: layer.content,
    paddingTop: space._3,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    paddingLeft: contentInsetLeft,
    paddingRight: contentInsetRight,
    marginLeft: `calc(-1 * ${layoutInsetLeft})`,
    marginRight: `calc(-1 * ${layoutInsetRight})`,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    backgroundColor: color.backgroundMain,
  },
});
