"use client";

import * as stylex from "@stylexjs/stylex";
import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type TextUIPart,
  type UIMessage,
} from "ai";
import { useState } from "react";
import {
  border,
  color,
  constants,
  font,
  shadow,
  space,
} from "#src/tokens.stylex.ts";
import { CompactionNotice } from "./compaction-notice";
import type { ToolOutputMaps } from "./map-tool-output";
import { SmoothedMarkdownContent } from "./smoothed-markdown-content";
import { ToolActivityGroup } from "./tool-activity-group";
import { ToolVisualOutput } from "./tool-visual-output";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  isLastAssistantMessage?: boolean;
  toolOutputs: ToolOutputMaps;
}

export function ChatMessage({
  message,
  isStreaming = false,
  isLastAssistantMessage = false,
  toolOutputs,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [releasedTextParts, setReleasedTextParts] = useState(1);

  const {
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
    textPartCount,
    textPartTrailingBuffers,
  } = deriveMessageData(message.parts);

  if (!hasVisibleContent) return null;

  let textPartIndex = 0;

  return (
    <div
      css={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
    >
      {message.parts.map((part, index) => {
        const key = partKeys[index];
        if (isTextUIPart(part)) {
          const currentTextIndex = textPartIndex++;
          if (isUser) {
            return (
              <p key={key} css={[styles.partBase, styles.text]}>
                {part.text}
              </p>
            );
          }

          // During streaming, queue text parts so each waits for the
          // previous one's animation to finish before appearing.
          if (isStreaming && currentTextIndex >= releasedTextParts) return null;

          if (isCompactionPart(part)) {
            return (
              <div key={key} css={styles.partBase}>
                <CompactionNotice />
              </div>
            );
          }

          const isActiveTextPart =
            isStreaming && currentTextIndex === releasedTextParts - 1;
          // Won't receive more content — safe to fire onCaughtUp
          const isSealed = !isStreaming || currentTextIndex < textPartCount - 1;
          return (
            <div key={key} css={styles.partBase}>
              <SmoothedMarkdownContent
                content={part.text}
                onCaughtUp={
                  isActiveTextPart
                    ? () => {
                        setReleasedTextParts((prev) => prev + 1);
                      }
                    : undefined
                }
                sealed={isSealed}
                startRevealed={!isStreaming}
                trailingBufferHint={
                  isStreaming
                    ? textPartTrailingBuffers[currentTextIndex]
                    : undefined
                }
              />
            </div>
          );
        }

        if (isReasoningUIPart(part)) {
          return (
            <p key={key} css={[styles.partBase, styles.reasoning]}>
              {part.text}
            </p>
          );
        }

        if (isToolUIPart(part)) {
          const toolName = getToolName(part);
          const isFirstTool = index === firstToolIndex;
          const hasVisualOutput =
            toolName === "present_media" ||
            toolName === "present_watch_providers" ||
            toolName === "present_provider_regions" ||
            toolName === "present_person" ||
            toolName === "review_summary";

          if (!isFirstTool && !hasVisualOutput) return null;

          const toolInput = "input" in part ? part.input : undefined;
          const toolOutput = "output" in part ? part.output : undefined;
          return (
            <div key={key}>
              {isFirstTool && (
                <ToolActivityGroup
                  toolParts={toolParts}
                  isStreaming={isStreaming}
                />
              )}
              {hasVisualOutput && (
                <ToolVisualOutput
                  toolName={toolName}
                  state={part.state}
                  input={toolInput}
                  output={toolOutput}
                  searchResultsMap={toolOutputs.searchResultsMap}
                  personResultsMap={toolOutputs.personResultsMap}
                  watchProvidersMap={toolOutputs.watchProvidersMap}
                  isLastAssistantMessage={isLastAssistantMessage}
                />
              )}
            </div>
          );
        }

        // step-start, source-url, source-document, file, data — intentionally invisible
        return null;
      })}
    </div>
  );
}

function isCompactionPart(part: TextUIPart): boolean {
  return part.providerMetadata?.anthropic.type === "compaction";
}

export function deriveMessageData(parts: UIMessage["parts"]) {
  const toolParts: Array<{
    toolCallId: string;
    toolName: string;
    state: string;
    input: unknown;
    output: unknown;
  }> = [];
  let hasVisibleContent = false;
  let firstToolIndex = -1;
  let textPartCount = 0;
  const textPartLengths: number[] = [];
  const partKeys: string[] = [];
  const typeCounts = new Map<string, number>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Generate a stable key for each part
    if (isToolUIPart(part)) {
      partKeys.push(`tool-${part.toolCallId}`);
    } else {
      const typeKey = part.type;
      const count = typeCounts.get(typeKey) ?? 0;
      typeCounts.set(typeKey, count + 1);
      partKeys.push(`${typeKey}-${String(count)}`);
    }

    if (isToolUIPart(part)) {
      const name = getToolName(part);
      if (firstToolIndex === -1) firstToolIndex = i;
      toolParts.push({
        toolCallId: part.toolCallId,
        toolName: name,
        state: part.state,
        input: "input" in part ? part.input : undefined,
        output: "output" in part ? part.output : undefined,
      });
      hasVisibleContent = true;
    } else {
      if (isTextUIPart(part)) {
        textPartCount++;
        textPartLengths.push(part.text.length);
        if (!hasVisibleContent && part.text.length > 0)
          hasVisibleContent = true;
      } else if (!hasVisibleContent && isReasoningUIPart(part)) {
        hasVisibleContent = true;
      }
    }
  }

  const textPartTrailingBuffers: number[] = [];
  let trailingSum = 0;
  for (let i = textPartLengths.length - 1; i >= 0; i--) {
    textPartTrailingBuffers[i] = trailingSum;
    trailingSum += textPartLengths[i];
  }

  return {
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
    textPartCount,
    textPartTrailingBuffers,
  };
}

const styles = stylex.create({
  bubble: {
    maxWidth: "100%",
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
    backgroundColor: {
      default: color.backgroundRaised,
      [constants.DARK]: `rgba(${color.backgroundRaisedChannels}, 0.6)`,
    },
    backdropFilter: "blur(12px)",
    boxShadow: {
      default: shadow._1,
      [constants.DARK]: "none",
    },
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
