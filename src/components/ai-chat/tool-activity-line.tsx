"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import * as stylex from "@stylexjs/stylex";
import { isToolError } from "#src/ai-chat/tools/tool-error.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { truncate } from "#src/primitives/layout.stylex.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { isRecord } from "#src/utils/type-guards.ts";

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
  if (Array.isArray(input.media)) return input.media.length;
  return null;
}

function getPersonCount(input: unknown): number | null {
  if (!isRecord(input)) return null;
  if (Array.isArray(input.people)) return input.people.length;
  return null;
}

function getPersonIdSummary(input: unknown): string | null {
  if (!isRecord(input)) return null;
  if (typeof input.person_id === "number") {
    return `ID ${input.person_id}`;
  }
  return null;
}

interface ToolActivityLineProps {
  toolName: string;
  state: string;
  input: unknown;
  output?: unknown;
}

export function ToolActivityLine({
  toolName,
  state,
  input,
  output,
}: ToolActivityLineProps) {
  const hasStructuredError = isToolError(output);
  const isComplete = state === "output-available" && !hasStructuredError;
  const isError =
    state === "output-error" || state === "output-denied" || hasStructuredError;
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
    case "watch_providers":
      label = t({ en: "Watch Providers", zh: "观看渠道" });
      break;
    case "media_credits":
      label = t({ en: "Cast & Crew", zh: "演职人员" });
      break;
    case "person_credits":
      label = t({ en: "Person Credits", zh: "人物作品" });
      break;
    case "present_person":
      label = t({ en: "Presenting People", zh: "展示人物" });
      break;
    case "present_watch_providers":
      label = t({ en: "Presenting Providers", zh: "展示观看渠道" });
      break;
    case "present_provider_regions":
      label = t({ en: "Presenting Regions", zh: "展示地区" });
      break;
    case "review_summary":
      label = t({ en: "Review Summary", zh: "评论摘要" });
      break;
    case "web_search":
      label = t({ en: "Web Search", zh: "网络搜索" });
      break;
    case "save_preference":
      label = t({ en: "Saving Preferences", zh: "保存偏好" });
      break;
    default:
      label = toolName;
  }

  const itemSingular = t({ en: "item", zh: "个项目" });
  const itemPlural = t({ en: "items", zh: "个项目" });

  let summary: string | null = null;
  if (
    toolName === "tmdb_search" ||
    toolName === "semantic_search" ||
    toolName === "web_search"
  ) {
    summary = getQuerySummary(input);
  } else if (toolName === "watch_providers") {
    if (isRecord(input)) {
      if (typeof input.provider_name === "string") {
        summary = input.provider_name;
      } else if (typeof input.region === "string") {
        summary = input.region;
      }
    }
  } else if (toolName === "present_media") {
    const count = getMediaCount(input);
    if (count !== null) {
      summary =
        count.toString() + " " + (count === 1 ? itemSingular : itemPlural);
    }
  } else if (toolName === "media_credits") {
    // No good summary available — media_credits input only has ID + type
    summary = null;
  } else if (toolName === "person_credits") {
    summary = getPersonIdSummary(input);
  } else if (toolName === "present_person") {
    const count = getPersonCount(input);
    if (count !== null) {
      summary =
        count.toString() + " " + (count === 1 ? itemSingular : itemPlural);
    }
  } else if (toolName === "present_watch_providers") {
    if (isRecord(input) && typeof input.region === "string") {
      summary = input.region;
    }
  } else if (toolName === "present_provider_regions") {
    if (isRecord(input) && typeof input.provider_name === "string") {
      summary = input.provider_name;
    }
  } else if (toolName === "review_summary") {
    if (isRecord(input) && typeof input.title === "string") {
      summary =
        input.title.length > MAX_SUMMARY_LENGTH
          ? `${input.title.slice(0, MAX_SUMMARY_LENGTH)}…`
          : input.title;
    }
  } else if (toolName === "save_preference") {
    if (isRecord(input) && Array.isArray(input.preferences)) {
      const count = input.preferences.length;
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

const pulseReduced = stylex.keyframes({
  "0%, 100%": { opacity: 0.4 },
  "50%": { opacity: 1 },
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
    animationName: {
      default: pulse,
      [motionConstants.REDUCED_MOTION]: pulseReduced,
    },
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
