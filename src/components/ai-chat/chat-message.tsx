"use client";

import * as stylex from "@stylexjs/stylex";
import { isReasoningUIPart, isTextUIPart, type UIMessage } from "ai";
import { memo } from "react";
import { border, color, font, space } from "#src/tokens.stylex.ts";

interface ChatMessageProps {
  message: UIMessage;
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      css={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
    >
      {message.parts.map((part, index) => {
        if (isTextUIPart(part)) {
          return (
            <p key={index} css={[styles.partBase, styles.text]}>
              {part.text}
            </p>
          );
        }

        if (isReasoningUIPart(part)) {
          return (
            <p key={index} css={[styles.partBase, styles.reasoning]}>
              {part.text}
            </p>
          );
        }

        // Other part types handled in #1651
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
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: font.lineHeight_4,
  },
  text: {
    fontSize: font.uiBody,
  },
  reasoning: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
  },
});
