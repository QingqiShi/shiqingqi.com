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
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { CompactionNotice } from "./compaction-notice";
import { buildSearchResultsMap } from "./map-tool-output";
import { MarkdownContent } from "./markdown-content";
import { ToolActivityGroup } from "./tool-activity-group";
import { ToolVisualOutput } from "./tool-visual-output";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({
  message,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  const {
    searchResultsMap,
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
  } = deriveMessageData(message.parts);

  if (!hasVisibleContent) return null;

  return (
    <div
      css={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
    >
      {message.parts.map((part, index) => {
        const key = partKeys[index];
        if (isTextUIPart(part)) {
          if (isUser) {
            return (
              <p key={key} css={[styles.partBase, styles.text]}>
                {part.text}
              </p>
            );
          }
          if (isCompactionPart(part)) {
            return (
              <div key={key} css={styles.partBase}>
                <CompactionNotice />
              </div>
            );
          }
          return (
            <div key={key} css={styles.partBase}>
              <MarkdownContent content={part.text} />
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
            toolName === "present_media" || toolName === "watch_providers";

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
                  searchResultsMap={searchResultsMap}
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
  return part.providerMetadata?.anthropic?.type === "compaction";
}

function deriveMessageData(parts: UIMessage["parts"]) {
  const searchResultsMap = new Map<string, MediaListItem>();
  const toolParts: Array<{
    toolCallId: string;
    toolName: string;
    state: string;
    input: unknown;
  }> = [];
  let hasVisibleContent = false;
  let firstToolIndex = -1;
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
      partKeys.push(`${typeKey}-${count}`);
    }

    if (isToolUIPart(part)) {
      const name = getToolName(part);
      if (firstToolIndex === -1) firstToolIndex = i;
      toolParts.push({
        toolCallId: part.toolCallId,
        toolName: name,
        state: part.state,
        input: "input" in part ? part.input : undefined,
      });
      hasVisibleContent = true;

      if (
        "output" in part &&
        part.state === "output-available" &&
        (name === "tmdb_search" || name === "semantic_search")
      ) {
        const partMap = buildSearchResultsMap(name, part.output);
        for (const [key, value] of partMap) {
          searchResultsMap.set(key, value);
        }
      }
    } else if (!hasVisibleContent) {
      if (isTextUIPart(part) && part.text.length > 0) hasVisibleContent = true;
      else if (isReasoningUIPart(part)) hasVisibleContent = true;
    }
  }

  return {
    searchResultsMap,
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
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
