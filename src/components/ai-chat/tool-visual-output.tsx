"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { resolveMediaItems } from "./map-tool-output";
import { ToolMediaCards } from "./tool-media-cards";
import { ToolMediaCardsSkeleton } from "./tool-media-cards-skeleton";
import {
  parseWatchProviderOutput,
  ToolWatchProviders,
} from "./tool-watch-providers";
import { ToolWatchProvidersSkeleton } from "./tool-watch-providers-skeleton";

interface ToolVisualOutputProps {
  toolName: string;
  state: string;
  input: unknown;
  output?: unknown;
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
}

export function ToolVisualOutput({
  toolName,
  state,
  input,
  output,
  searchResultsMap,
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

  if (toolName === "watch_providers") {
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

    if (state === "input-streaming" || state === "input-available") {
      return <ToolWatchProvidersSkeleton />;
    }

    if (state === "output-available") {
      const data = parseWatchProviderOutput(output);
      if (!data) return null;
      return <ToolWatchProviders data={data} />;
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
