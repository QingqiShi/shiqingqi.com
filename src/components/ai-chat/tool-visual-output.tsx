"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import {
  resolveMediaItems,
  resolvePersonItems,
  resolveProviderRegions,
  resolveWatchProviders,
} from "./map-tool-output";
import { ToolMediaCards } from "./tool-media-cards";
import { ToolMediaCardsSkeleton } from "./tool-media-cards-skeleton";
import { ToolPersonCards } from "./tool-person-cards";
import {
  parseReviewSummaryOutput,
  ToolReviewSummary,
} from "./tool-review-summary";
import { ToolReviewSummarySkeleton } from "./tool-review-summary-skeleton";
import type { WatchProviderOutput } from "./tool-watch-providers";
import { ToolWatchProviders } from "./tool-watch-providers";
import { ToolWatchProvidersSkeleton } from "./tool-watch-providers-skeleton";

interface ToolVisualOutputProps {
  toolName: string;
  state: string;
  input: unknown;
  output?: unknown;
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
  personResultsMap: ReadonlyMap<number, PersonListItem>;
  watchProvidersMap: ReadonlyMap<string, WatchProviderOutput>;
  isLastAssistantMessage?: boolean;
}

export function ToolVisualOutput({
  toolName,
  state,
  input,
  output,
  searchResultsMap,
  personResultsMap,
  watchProvidersMap,
  isLastAssistantMessage = false,
}: ToolVisualOutputProps) {
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

  if (toolName === "present_person") {
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
      const items = resolvePersonItems(input, personResultsMap);
      if (items.length === 0) return null;
      return <ToolPersonCards items={items} />;
    }

    return null;
  }

  if (
    toolName === "present_watch_providers" ||
    toolName === "present_provider_regions"
  ) {
    if (state === "output-error") {
      return (
        <p css={styles.error} role="alert">
          {t({
            en: "Failed to load watch providers",
            zh: "加载观看渠道失败",
          })}
        </p>
      );
    }

    if (state === "input-streaming") {
      return <ToolWatchProvidersSkeleton />;
    }

    if (state === "input-available" || state === "output-available") {
      const data =
        toolName === "present_watch_providers"
          ? resolveWatchProviders(input, watchProvidersMap)
          : resolveProviderRegions(input, watchProvidersMap);
      if (!data) return null;
      return <ToolWatchProviders data={data} />;
    }

    return null;
  }

  if (toolName === "review_summary") {
    if (state === "output-error") {
      return (
        <p css={styles.error} role="alert">
          {t({
            en: "Failed to load review summary",
            zh: "加载评论摘要失败",
          })}
        </p>
      );
    }

    if (state === "input-streaming" || state === "input-available") {
      return <ToolReviewSummarySkeleton />;
    }

    if (state === "output-available") {
      const data = parseReviewSummaryOutput(output);
      if (!data) return null;
      return (
        <ToolReviewSummary data={data} isInteractive={isLastAssistantMessage} />
      );
    }

    return null;
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
