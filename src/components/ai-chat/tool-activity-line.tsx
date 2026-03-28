"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { truncate } from "#src/primitives/layout.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { isRecord } from "./map-tool-output";

export const TERMINAL_STATES = new Set([
  "output-available",
  "output-error",
  "output-denied",
]);

const ICON_SIZE = 14;
const MAX_SUMMARY_LENGTH = 60;

function getQuerySummary(input: unknown): string | null {
  if (!isRecord(input)) return null;
  if (typeof input.query === "string" && input.query.length > 0) {
    const query = input.query;
    return query.length > MAX_SUMMARY_LENGTH
      ? `"${query.slice(0, MAX_SUMMARY_LENGTH)}…"`
      : `"${query}"`;
  }
  return null;
}

function getMediaCount(input: unknown): number | null {
  if (!isRecord(input)) return null;
  if (Array.isArray(input.media)) {
    return input.media.length;
  }
  return null;
}

interface ToolActivityLineProps {
  toolName: string;
  state: string;
  input: unknown;
}

export function ToolActivityLine({
  toolName,
  state,
  input,
}: ToolActivityLineProps) {
  const isComplete = state === "output-available";
  const isError = state === "output-error" || state === "output-denied";
  const isInProgress = !TERMINAL_STATES.has(state);

  let label: string;
  switch (toolName) {
    case "tmdb_search":
      label = t({ en: "TMDB Search", zh: "TMDB 搜索" });
      break;
    case "semantic_search":
      label = t({ en: "Semantic Search", zh: "语义搜索" });
      break;
    case "present_media":
      label = t({ en: "Presenting Results", zh: "展示结果" });
      break;
    default:
      label = toolName;
  }

  const itemSingular = t({ en: "item", zh: "个项目" });
  const itemPlural = t({ en: "items", zh: "个项目" });

  let summary: string | null = null;
  if (toolName === "tmdb_search" || toolName === "semantic_search") {
    summary = getQuerySummary(input);
  } else if (toolName === "present_media") {
    const count = getMediaCount(input);
    if (count !== null) {
      summary =
        count.toString() + " " + (count === 1 ? itemSingular : itemPlural);
    }
  }

  return (
    <div css={[flex.row, styles.line]}>
      <span css={[flex.center, styles.icon]}>
        {isInProgress && <span css={styles.pulsingDot} />}
        {isComplete && (
          <CheckIcon size={ICON_SIZE} weight="bold" aria-hidden="true" />
        )}
        {isError && (
          <WarningCircleIcon
            size={ICON_SIZE}
            weight="bold"
            aria-hidden="true"
          />
        )}
      </span>
      <span css={styles.label}>{label}</span>
      {summary != null && (
        <>
          <span css={styles.separator} aria-hidden="true">
            ·
          </span>
          <span css={truncate.base}>{summary}</span>
        </>
      )}
    </div>
  );
}

const pulse = stylex.keyframes({
  "0%, 100%": { opacity: 0.4, transform: "scale(0.85)" },
  "50%": { opacity: 1, transform: "scale(1)" },
});

const styles = stylex.create({
  line: {
    gap: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: 1.4,
    minHeight: "1.5rem",
  },
  icon: {
    width: "14px",
    height: "14px",
    flexShrink: 0,
  },
  pulsingDot: {
    width: "0.375rem",
    height: "0.375rem",
    borderRadius: border.radius_round,
    backgroundColor: color.textMuted,
    animationName: pulse,
    animationDuration: "1.4s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
  label: {
    fontWeight: font.weight_5,
    whiteSpace: "nowrap",
  },
  separator: {
    opacity: 0.5,
  },
});
