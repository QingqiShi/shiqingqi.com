"use client";

import * as stylex from "@stylexjs/stylex";
import { pageColumn, pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { border, color, layer, rhythm, space } from "@tuja/ui/tokens.stylex";
import { getScrollBehavior } from "@tuja/ui/utils/get-scroll-behavior";
import { ViewTransition, useEffect, useState, type ReactNode } from "react";
import { MediaDetailOverlay } from "#src/movie-database/details/media-detail-overlay.tsx";
import { MediaDetailProvider } from "#src/movie-database/details/media-detail-provider.tsx";
import { PersonDetailOverlay } from "#src/movie-database/details/person-detail-overlay.tsx";
import { PreferenceManager } from "#src/movie-database/taste/preference-panel.tsx";
import { useAIChatContext } from "./ai-chat-provider.tsx";
import {
  ChatActionsContext,
  type AttachedMedia,
} from "./chat-actions-context.tsx";
import { ChatInputBar } from "./chat-input-bar.tsx";
import { ChatMessageList, SCROLL_THRESHOLD } from "./chat-message-list.tsx";
import { ScrollToBottomButton } from "./scroll-to-bottom-button.tsx";
import { SessionRestoreBanner } from "./session-restore-banner.tsx";

interface InlineChatViewProps {
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

export function InlineChatView({
  emptyState,
  messagesLabel,
  typingIndicatorLabel,
  scrollToBottomLabel,
  errorLabel,
  placeholder,
  sendLabel,
  stopLabel,
  removeAttachmentLabel,
}: InlineChatViewProps) {
  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    toolOutputs,
    previousSessionId,
    continueSession,
    continueSessionStatus,
    dismissPreviousSession,
  } = useAIChatContext();
  const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(
    null,
  );
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollHeight } = document.documentElement;
      const atBottom =
        scrollHeight - window.scrollY - window.innerHeight < SCROLL_THRESHOLD;
      setIsAtBottom(atBottom);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: getScrollBehavior(),
    });
    setIsAtBottom(true);
  };

  const handleSend = (text: string) => {
    const message = attachedMedia
      ? `[About: ${attachedMedia.title} (${attachedMedia.mediaType}, id:${String(attachedMedia.id)})] ${text}`
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
        <div css={[pageColumn.base, styles.container]}>
          {previousSessionId && messages.length === 0 && (
            <SessionRestoreBanner
              onContinue={continueSession}
              onDismiss={dismissPreviousSession}
              isPending={continueSessionStatus === "pending"}
              hasError={continueSessionStatus === "error"}
            />
          )}
          <ChatMessageList
            messages={messages}
            status={status}
            error={error}
            isAtBottom={isAtBottom}
            toolOutputs={toolOutputs}
            emptyState={emptyState}
            messagesLabel={messagesLabel}
            typingIndicatorLabel={typingIndicatorLabel}
            errorLabel={errorLabel}
          />
          <div css={styles.inputArea}>
            <ScrollToBottomButton
              visible={!isAtBottom && messages.length > 0}
              label={scrollToBottomLabel}
              onClick={scrollToBottom}
            />
            <div css={styles.inputMeta}>
              <PreferenceManager />
            </div>
            <ViewTransition
              name="inline-chat-input"
              share="inline-chat-input-morph"
            >
              <div css={styles.inputShell}>
                <ChatInputBar
                  placeholder={placeholder}
                  sendLabel={sendLabel}
                  stopLabel={stopLabel}
                  removeAttachmentLabel={removeAttachmentLabel}
                  status={status}
                  attachedMedia={attachedMedia}
                  onSend={handleSend}
                  onStop={() => {
                    void stop();
                  }}
                  onClearAttachment={() => {
                    setAttachedMedia(null);
                  }}
                />
              </div>
            </ViewTransition>
          </div>
        </div>
        <MediaDetailOverlay />
        <PersonDetailOverlay />
      </ChatActionsContext>
    </MediaDetailProvider>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top))`,
  },
  inputMeta: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: rhythm.tight,
  },
  inputShell: {
    display: "block",
  },
  inputArea: {
    position: "sticky",
    bottom: 0,
    flexShrink: 0,
    zIndex: layer.content,
    paddingTop: space._3,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    paddingInlineStart: pageGutter.inlineStart,
    paddingInlineEnd: pageGutter.inlineEnd,
    marginInlineStart: `calc(-1 * ${pageGutter.inlineStart})`,
    marginInlineEnd: `calc(-1 * ${pageGutter.inlineEnd})`,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
    backgroundColor: color.bgCanvas,
  },
});
