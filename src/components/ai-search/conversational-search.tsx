"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { useConversationalAISearch } from "@/hooks/use-conversational-ai-search";
import { useTranslations } from "@/hooks/use-translations";
import { color, font, space } from "@/tokens.stylex";
import type translations from "../../app/[locale]/movie-database/translations.json";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { ChatContainer } from "./chat-container";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

interface ConversationalSearchProps {
  locale: "en" | "zh";
  initialQuery?: string;
  onInitialQuerySent?: () => void;
}

export function ConversationalSearch({
  locale,
  initialQuery,
  onInitialQuerySent,
}: ConversationalSearchProps) {
  const { t } = useTranslations<typeof translations>("movie-database");
  const { messages, sendMessage, clearConversation, isStreaming } =
    useConversationalAISearch(locale);

  const initialQuerySentRef = useRef(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inputFocusRef = useRef<{ focus: () => void } | null>(null);

  // Send initial query if provided (only once)
  useEffect(() => {
    if (initialQuery && !initialQuerySentRef.current && messages.length === 0) {
      sendMessage(initialQuery);
      onInitialQuerySent?.();
      initialQuerySentRef.current = true;
    }
  }, [initialQuery, messages.length, sendMessage, onInitialQuerySent]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputFocusRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClearConversation = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    clearConversation();
    setShowClearConfirm(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div css={styles.wrapper}>
      <ChatContainer
        onClearConversation={handleClearConversation}
        hasMessages={messages.length > 0}
        emptyStateContent={
          <div css={styles.emptyState}>
            <h2 css={styles.emptyTitle}>{t("aiSearchResults")}</h2>
            <p css={styles.emptySubtitle}>{t("chatInputPlaceholder")}</p>
            <div css={styles.exampleQueries}>
              <p css={styles.exampleLabel}>Example queries:</p>
              <button
                css={styles.exampleButton}
                onClick={() => sendMessage(t("exampleQuery1"))}
                type="button"
              >
                {t("exampleQuery1")}
              </button>
              <button
                css={styles.exampleButton}
                onClick={() => sendMessage(t("exampleQuery2"))}
                type="button"
              >
                {t("exampleQuery2")}
              </button>
              <button
                css={styles.exampleButton}
                onClick={() => sendMessage(t("exampleQuery3"))}
                type="button"
              >
                {t("exampleQuery3")}
              </button>
            </div>
          </div>
        }
      >
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            thinking={message.thinking}
            results={message.results}
            isStreaming={message.status === "streaming"}
            error={message.error}
          />
        ))}
      </ChatContainer>
      <div css={styles.inputWrapper}>
        <ChatInput
          ref={inputFocusRef}
          onSubmit={sendMessage}
          disabled={isStreaming}
          placeholder={t("chatInputPlaceholder")}
          maxLength={1000}
        />
      </div>
      <ConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={handleConfirmClear}
        onCancel={handleCancelClear}
        title={t("clearConversation")}
        message={t("clearConversationConfirm")}
        confirmLabel={t("clear")}
        cancelLabel={t("cancel")}
      />
    </div>
  );
}

const styles = stylex.create({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: color.backgroundMain,
  },

  inputWrapper: {
    flexShrink: 0,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
    backgroundColor: color.backgroundRaised,
    padding: space._3,
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: space._6,
    gap: space._4,
  },

  emptyTitle: {
    fontSize: font.size_6,
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
  },

  emptySubtitle: {
    fontSize: font.size_2,
    color: color.textMuted,
    margin: 0,
  },

  exampleQueries: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    marginTop: space._4,
    width: "100%",
    maxWidth: "400px",
  },

  exampleLabel: {
    fontSize: font.size_1,
    color: color.textMuted,
    margin: 0,
    marginBottom: space._1,
  },

  exampleButton: {
    padding: space._3,
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
    color: color.textMain,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.controlTrack,
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: font.size_2,
    textAlign: "left",
    transition: "all 0.2s ease",
  },
});
