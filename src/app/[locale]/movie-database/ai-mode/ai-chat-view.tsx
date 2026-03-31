"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode } from "react";
import { useAIChat } from "#src/ai-chat/use-ai-chat.ts";
import {
  ChatActionsContext,
  type AttachedMedia,
} from "#src/components/ai-chat/chat-actions-context.tsx";
import { ChatInputBar } from "#src/components/ai-chat/chat-input-bar.tsx";
import { ChatMessageList } from "#src/components/ai-chat/chat-message-list.tsx";
import { MediaDetailProvider } from "#src/components/ai-chat/media-detail-context.tsx";
import { MediaDetailOverlay } from "#src/components/ai-chat/media-detail-overlay.tsx";
import { PersonDetailOverlay } from "#src/components/ai-chat/person-detail-overlay.tsx";
import { SessionRestoreBanner } from "#src/components/ai-chat/session-restore-banner.tsx";
import { border, color, layer, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";

interface AIChatViewProps {
  locale: SupportedLocale;
  emptyState: ReactNode;
  messagesLabel: string;
  typingIndicatorLabel: string;
  scrollToBottomLabel: string;
  errorLabel: string;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  removeAttachmentLabel: string;
}

export function AIChatView({
  locale,
  emptyState,
  messagesLabel,
  typingIndicatorLabel,
  scrollToBottomLabel,
  errorLabel,
  placeholder,
  sendLabel,
  stopLabel,
  removeAttachmentLabel,
}: AIChatViewProps) {
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    previousSessionId,
    continueSession,
  } = useAIChat({ locale });
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(
    null,
  );

  const handleSend = (text: string) => {
    const message = attachedMedia
      ? `[About: ${attachedMedia.title} (${attachedMedia.mediaType})] ${text}`
      : text;
    setAttachedMedia(null);
    void sendMessage({ text: message });
  };

  return (
    <MediaDetailProvider>
      <ChatActionsContext
        value={{
          sendMessage: handleSend,
          attachedMedia,
          setAttachedMedia,
        }}
      >
        {previousSessionId && messages.length === 0 && (
          <SessionRestoreBanner onContinue={continueSession} />
        )}
        <ChatMessageList
          messages={messages}
          status={status}
          error={error}
          emptyState={emptyState}
          messagesLabel={messagesLabel}
          typingIndicatorLabel={typingIndicatorLabel}
          scrollToBottomLabel={scrollToBottomLabel}
          errorLabel={errorLabel}
        />
        <div css={styles.inputArea}>
          <ChatInputBar
            placeholder={placeholder}
            sendLabel={sendLabel}
            stopLabel={stopLabel}
            removeAttachmentLabel={removeAttachmentLabel}
            status={status}
            attachedMedia={attachedMedia}
            onSend={handleSend}
            onStop={stop}
            onClearAttachment={() => setAttachedMedia(null)}
          />
        </div>
        <MediaDetailOverlay />
        <PersonDetailOverlay />
      </ChatActionsContext>
    </MediaDetailProvider>
  );
}

/**
 * Horizontal inset from viewport edge to content.
 * Padding chain: layout (space._3 + safe-area).
 * See also: recommended-media-row.tsx which uses the same offsets.
 */
const contentInsetLeft = `calc(${space._3} + env(safe-area-inset-left, 0px))`;
const contentInsetRight = `calc(${space._3} + env(safe-area-inset-right, 0px))`;

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
    marginLeft: `calc(-1 * ${contentInsetLeft})`,
    marginRight: `calc(-1 * ${contentInsetRight})`,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    backgroundColor: color.backgroundMain,
  },
});
