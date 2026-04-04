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
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import { CompactionNotice } from "./compaction-notice";
import {
  buildPersonResultsMap,
  buildSearchResultsMap,
  buildWatchProvidersMap,
} from "./map-tool-output";
import { MarkdownContent } from "./markdown-content";
import { ToolActivityGroup } from "./tool-activity-group";
import { ToolVisualOutput } from "./tool-visual-output";
import type { WatchProviderOutput } from "./tool-watch-providers";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  isLastAssistantMessage?: boolean;
  cumulativeSearchResults?: ReadonlyMap<string, MediaListItem>;
  cumulativePersonResults?: ReadonlyMap<number, PersonListItem>;
  cumulativeWatchProviders?: ReadonlyMap<string, WatchProviderOutput>;
}

export function ChatMessage({
  message,
  isStreaming = false,
  isLastAssistantMessage = false,
  cumulativeSearchResults,
  cumulativePersonResults,
  cumulativeWatchProviders,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  const {
    searchResultsMap: localSearchResults,
    personResultsMap: localPersonResults,
    watchProvidersMap: localWatchProviders,
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
  } = deriveMessageData(message.parts);

  // Merge cumulative maps from prior messages with this message's own maps.
  // Local (per-message) entries take precedence over cumulative ones.
  const searchResultsMap = mergeMaps(
    cumulativeSearchResults,
    localSearchResults,
  );
  const personResultsMap = mergeMaps(
    cumulativePersonResults,
    localPersonResults,
  );
  const watchProvidersMap = mergeMaps(
    cumulativeWatchProviders,
    localWatchProviders,
  );

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
                  searchResultsMap={searchResultsMap}
                  personResultsMap={personResultsMap}
                  watchProvidersMap={watchProvidersMap}
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
  return part.providerMetadata?.anthropic?.type === "compaction";
}

export function deriveMessageData(parts: UIMessage["parts"]) {
  const searchResultsMap = new Map<string, MediaListItem>();
  const personResultsMap = new Map<number, PersonListItem>();
  const watchProvidersMap = new Map<string, WatchProviderOutput>();
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
        (name === "tmdb_search" ||
          name === "semantic_search" ||
          name === "person_credits")
      ) {
        const partMap = buildSearchResultsMap(name, part.output);
        for (const [key, value] of partMap) {
          searchResultsMap.set(key, value);
        }
      }

      if (
        "output" in part &&
        part.state === "output-available" &&
        (name === "tmdb_search" || name === "media_credits")
      ) {
        const partPersonMap = buildPersonResultsMap(name, part.output);
        for (const [key, value] of partPersonMap) {
          personResultsMap.set(key, value);
        }
      }

      if (
        "output" in part &&
        part.state === "output-available" &&
        name === "watch_providers"
      ) {
        const partWpMap = buildWatchProvidersMap(part.output);
        for (const [key, value] of partWpMap) {
          watchProvidersMap.set(key, value);
        }
      }
    } else if (!hasVisibleContent) {
      if (isTextUIPart(part) && part.text.length > 0) hasVisibleContent = true;
      else if (isReasoningUIPart(part)) hasVisibleContent = true;
    }
  }

  return {
    searchResultsMap,
    personResultsMap,
    watchProvidersMap,
    toolParts,
    hasVisibleContent,
    firstToolIndex,
    partKeys,
  };
}

/**
 * Merges a cumulative map from prior messages with a local map from the current
 * message. Local entries take precedence over cumulative ones.
 */
function mergeMaps<K, V>(
  cumulative: ReadonlyMap<K, V> | undefined,
  local: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  if (!cumulative || cumulative.size === 0) return local;
  if (local.size === 0) return cumulative;
  const merged = new Map(cumulative);
  for (const [key, value] of local) {
    merged.set(key, value);
  }
  return merged;
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
