"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { resolveMediaItems } from "./map-tool-output";
import { ToolMediaCards } from "./tool-media-cards";
import { ToolMediaCardsSkeleton } from "./tool-media-cards-skeleton";
import { TypingIndicator } from "./typing-indicator";

const SEARCH_TOOLS = new Set(["tmdb_search", "semantic_search"]);
const COMPLETE_STATES = new Set(["output-available", "output-error"]);

interface ChatToolPartProps {
  toolName: string;
  state: string;
  input: unknown;
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
}

export function ChatToolPart({
  toolName,
  state,
  input,
  searchResultsMap,
}: ChatToolPartProps) {
  if (SEARCH_TOOLS.has(toolName)) {
    if (state === "output-error") {
      return (
        <p css={styles.error} role="alert">
          {t({ en: "Search failed", zh: "搜索失败" })}
        </p>
      );
    }
    if (!COMPLETE_STATES.has(state)) {
      return (
        <TypingIndicator
          label={t({ en: "Searching\u2026", zh: "搜索中\u2026" })}
        />
      );
    }
    return null;
  }

  if (toolName === "present_media") {
    if (state === "output-error") {
      return (
        <p css={styles.error} role="alert">
          {t({ en: "Failed to load results", zh: "加载结果失败" })}
        </p>
      );
    }
    if (state === "input-streaming") {
      return <ToolMediaCardsSkeleton />;
    }
    if (state === "input-available" || state === "output-available") {
      const items = resolveMediaItems(input, searchResultsMap);
      if (items.length === 0) return null;
      return <ToolMediaCards items={items} />;
    }
    return null;
  }

  // Unknown tools: show activity while in progress, errors on failure
  if (state === "output-error") {
    return (
      <p css={styles.error} role="alert">
        {t({ en: "Something went wrong", zh: "出了点问题" })}
      </p>
    );
  }
  if (!COMPLETE_STATES.has(state)) {
    return (
      <TypingIndicator label={t({ en: "Working\u2026", zh: "处理中\u2026" })} />
    );
  }

  return null;
}

const styles = stylex.create({
  error: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    fontStyle: "italic",
    paddingBlock: space._1,
  },
});
