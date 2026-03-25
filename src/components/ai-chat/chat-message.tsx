"use client";

import * as stylex from "@stylexjs/stylex";
import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { memo, useMemo } from "react";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { ChatToolPart } from "./chat-tool-part";
import { buildSearchResultsMap } from "./map-tool-output";
import { MarkdownContent } from "./markdown-content";

interface ChatMessageProps {
  message: UIMessage;
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  const searchResultsMap = useMemo(() => {
    const map = new Map<string, MediaListItem>();
    for (const part of message.parts) {
      if (
        isToolUIPart(part) &&
        "output" in part &&
        part.state === "output-available"
      ) {
        const name = getToolName(part);
        if (name === "tmdb_search" || name === "semantic_search") {
          const partMap = buildSearchResultsMap(name, part.output);
          for (const [key, value] of partMap) {
            map.set(key, value);
          }
        }
      }
    }
    return map;
  }, [message.parts]);

  return (
    <div
      css={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
    >
      {message.parts.map((part, index) => {
        if (isTextUIPart(part)) {
          if (isUser) {
            return (
              <p key={index} css={[styles.partBase, styles.text]}>
                {part.text}
              </p>
            );
          }
          return (
            <div key={index} css={styles.partBase}>
              <MarkdownContent content={part.text} />
            </div>
          );
        }

        if (isReasoningUIPart(part)) {
          return (
            <p key={index} css={[styles.partBase, styles.reasoning]}>
              {part.text}
            </p>
          );
        }

        if (isToolUIPart(part)) {
          return (
            <ChatToolPart
              key={index}
              toolName={getToolName(part)}
              state={part.state}
              input={"input" in part ? part.input : undefined}
              searchResultsMap={searchResultsMap}
            />
          );
        }

        return null;
      })}
    </div>
  );
});

const styles = stylex.create({
  bubble: {
    maxWidth: "85%",
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  userBubble: {
    marginLeft: "auto",
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    borderRadius: border.radius_3,
    borderBottomRightRadius: border.radius_1,
  },
  assistantBubble: {
    marginRight: "auto",
    backgroundColor: color.backgroundRaised,
    color: color.textMain,
    borderRadius: border.radius_3,
    borderBottomLeftRadius: border.radius_1,
  },
  partBase: {
    margin: 0,
    wordBreak: "break-word",
    lineHeight: font.lineHeight_4,
    fontSize: font.uiBody,
  },
  text: {
    whiteSpace: "pre-wrap",
  },
  reasoning: {
    whiteSpace: "pre-wrap",
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
  },
});
