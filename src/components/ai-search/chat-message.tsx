"use client";

import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@/tokens.stylex";
import type { MediaListItem } from "@/utils/types";
import { Grid } from "../movie-database/grid";
import { MediaCard } from "../movie-database/media-card";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  results?: MediaListItem[];
  isStreaming?: boolean;
  error?: string;
}

export function ChatMessage({
  role,
  content,
  thinking,
  results,
  isStreaming = false,
  error,
}: ChatMessageProps) {
  const isUser = role === "user";

  // Simple hardcoded translations for now
  const streamingIndicator = "●●●";
  const thinkingPrefix = "Thinking: ";
  const errorPrefix = "An error occurred";
  const noResultsText = "No results found";

  return (
    <article
      css={[styles.message, isUser && styles.userMessage]}
      aria-live={isStreaming ? "polite" : undefined}
      aria-atomic="true"
    >
      <div css={styles.messageContent}>
        {/* Thinking indicator (assistant only) */}
        {!isUser && thinking && (
          <div
            css={styles.thinkingIndicator}
            aria-label={`${thinkingPrefix}${thinking}`}
          >
            {thinkingPrefix}
            {thinking}
            {isStreaming && <span css={styles.streamingDots}>...</span>}
          </div>
        )}

        {/* Message text */}
        {content && (
          <div css={styles.messageText}>
            {content}
            {isStreaming && !thinking && (
              <span css={styles.streamingDots} aria-label={streamingIndicator}>
                {streamingIndicator}
              </span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div css={styles.errorMessage} role="alert">
            {errorPrefix}: {error}
          </div>
        )}

        {/* Results grid */}
        {results && results.length > 0 && (
          <div css={styles.resultsContainer}>
            <Grid>
              {results.map((item) => (
                <MediaCard key={item.id} media={item} />
              ))}
            </Grid>
          </div>
        )}

        {/* No results message */}
        {results && results.length === 0 && !isStreaming && (
          <div css={styles.noResults}>{noResultsText}</div>
        )}
      </div>
    </article>
  );
}

const styles = stylex.create({
  message: {
    display: "flex",
    flexDirection: "column",
    marginBottom: space._4,
    width: "100%",
  },

  userMessage: {
    alignItems: "flex-end",
  },

  messageContent: {
    maxWidth: "85%",
    padding: space._3,
    borderRadius: "12px",
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
    },
  },

  messageText: {
    fontSize: font.size_2,
    lineHeight: 1.5,
    color: color.textMain,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  thinkingIndicator: {
    fontSize: font.size_1,
    color: color.textMuted,
    fontStyle: "italic",
    marginBottom: space._2,
  },

  streamingDots: {
    display: "inline-block",
    marginLeft: "0.25rem",
    animationName: stylex.keyframes({
      "0%, 20%": { opacity: 0.2 },
      "50%": { opacity: 1 },
      "100%": { opacity: 0.2 },
    }),
    animationDuration: "1.4s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },

  errorMessage: {
    fontSize: font.size_1,
    color: color.brandBristol,
    marginTop: space._2,
    padding: space._2,
    borderRadius: "6px",
    backgroundColor: color.backgroundRaised,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.brandBristol,
  },

  resultsContainer: {
    marginTop: space._3,
  },

  noResults: {
    fontSize: font.size_1,
    color: color.textMuted,
    textAlign: "center",
    padding: space._3,
  },
});
