"use client";

import * as stylex from "@stylexjs/stylex";
import type { ChatStatus, UIMessage } from "ai";
import { type ReactNode, useEffect, useState } from "react";
import {
  COMPACTION_TRIGGER_TOKENS,
  USAGE_WARNING_RATIO,
} from "#src/ai-chat/context-management-shared.ts";
import type { ChatMessageMetadata } from "#src/ai-chat/use-ai-chat.ts";
import { t } from "#src/i18n.ts";
import { usePreferencePersistence } from "#src/preference-store/use-preference-persistence.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import { ChatMessage, deriveMessageData } from "./chat-message";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import type { WatchProviderOutput } from "./tool-watch-providers";
import { TypingIndicator } from "./typing-indicator";

const SCROLL_THRESHOLD = 50;
const USAGE_WARNING_THRESHOLD = COMPACTION_TRIGGER_TOKENS * USAGE_WARNING_RATIO;

interface ChatMessageListProps {
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>;
  status: ChatStatus;
  error: Error | undefined;
  emptyState: ReactNode;
  messagesLabel: string;
  typingIndicatorLabel: string;
  scrollToBottomLabel: string;
  errorLabel: string;
}

function getLatestInputTokens(
  messages: ReadonlyArray<UIMessage<ChatMessageMetadata>>,
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role === "assistant" && msg.metadata?.inputTokens != null) {
      return msg.metadata.inputTokens;
    }
  }
  return 0;
}

interface CumulativeMaps {
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
  personResultsMap: ReadonlyMap<number, PersonListItem>;
  watchProvidersMap: ReadonlyMap<string, WatchProviderOutput>;
}

/**
 * For each message, builds a cumulative map of search results, person results,
 * and watch providers from all *prior* messages. This allows later messages
 * (e.g. a second `present_media` call) to look up items discovered by earlier
 * tool calls without re-searching.
 */
function buildCumulativeMaps(
  messages: ReadonlyArray<UIMessage>,
): ReadonlyArray<CumulativeMaps> {
  const result: CumulativeMaps[] = [];
  const cumulativeSearch = new Map<string, MediaListItem>();
  const cumulativePerson = new Map<number, PersonListItem>();
  const cumulativeWp = new Map<string, WatchProviderOutput>();

  for (const message of messages) {
    // Each message gets a snapshot of the cumulative maps from *prior* messages
    result.push({
      searchResultsMap: new Map(cumulativeSearch),
      personResultsMap: new Map(cumulativePerson),
      watchProvidersMap: new Map(cumulativeWp),
    });

    // After taking the snapshot, add this message's results to the cumulative maps
    const { searchResultsMap, personResultsMap, watchProvidersMap } =
      deriveMessageData(message.parts);

    for (const [key, value] of searchResultsMap) {
      cumulativeSearch.set(key, value);
    }
    for (const [key, value] of personResultsMap) {
      cumulativePerson.set(key, value);
    }
    for (const [key, value] of watchProvidersMap) {
      cumulativeWp.set(key, value);
    }
  }

  return result;
}

export function ChatMessageList({
  messages,
  status,
  error,
  emptyState,
  messagesLabel,
  typingIndicatorLabel,
  scrollToBottomLabel,
  errorLabel,
}: ChatMessageListProps) {
  usePreferencePersistence(messages);

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
  const lastAssistantIndex = messages.findLastIndex(
    (m) => m.role === "assistant",
  );

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottom || lastMessageRole === "user") {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    }
  }, [messages.length, lastMessageRole, isAtBottom]);

  useEffect(() => {
    if (status !== "streaming") return;

    let rafId: number;
    let lastScrollHeight = document.documentElement.scrollHeight;

    const tick = () => {
      const currentScrollHeight = document.documentElement.scrollHeight;
      if (isAtBottom && currentScrollHeight !== lastScrollHeight) {
        window.scrollTo({ top: currentScrollHeight });
        lastScrollHeight = currentScrollHeight;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [status, isAtBottom]);

  const showTypingIndicator = status === "submitted";
  const showError = status === "error" && error != null;
  const latestInputTokens = getLatestInputTokens(messages);
  const showUsageWarning = latestInputTokens >= USAGE_WARNING_THRESHOLD;

  // Build cumulative search/person/watch-provider maps so that later messages
  // can look up media items discovered by earlier tool calls (e.g. a second
  // present_media call can find items from a prior tmdb_search).
  const cumulativeMaps = buildCumulativeMaps(messages);

  return (
    <div css={[flex.col, styles.container]}>
      {messages.length === 0 ? (
        <div css={styles.emptyStateWrapper}>{emptyState}</div>
      ) : (
        <div
          role="log"
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
              cumulativeSearchResults={cumulativeMaps[index]?.searchResultsMap}
              cumulativePersonResults={cumulativeMaps[index]?.personResultsMap}
              cumulativeWatchProviders={
                cumulativeMaps[index]?.watchProvidersMap
              }
            />
          ))}
          {showTypingIndicator && (
            <TypingIndicator label={typingIndicatorLabel} />
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
