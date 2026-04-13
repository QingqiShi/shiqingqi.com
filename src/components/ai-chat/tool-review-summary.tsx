"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CoffeeIcon } from "@phosphor-icons/react/dist/ssr/Coffee";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PepperIcon } from "@phosphor-icons/react/dist/ssr/Pepper";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import { SmileyWinkIcon } from "@phosphor-icons/react/dist/ssr/SmileyWink";
import * as stylex from "@stylexjs/stylex";
import type { ComponentType } from "react";
import { useState } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import { useChatActions } from "./chat-actions-context";

interface ReviewSummaryData {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  spiciness: number;
  summary: string;
  reviewCount: number;
  averageRating: number | null;
}

export function parseReviewSummaryOutput(
  output: unknown,
): ReviewSummaryData | null {
  if (!isRecord(output)) return null;
  if (typeof output.id !== "number") return null;
  if (output.mediaType !== "movie" && output.mediaType !== "tv") return null;
  if (typeof output.title !== "string") return null;
  if (typeof output.spiciness !== "number") return null;
  if (typeof output.summary !== "string") return null;
  if (typeof output.reviewCount !== "number") return null;

  const averageRating =
    typeof output.averageRating === "number" ? output.averageRating : null;

  return {
    id: output.id,
    mediaType: output.mediaType,
    title: output.title,
    spiciness: output.spiciness,
    summary: output.summary,
    reviewCount: output.reviewCount,
    averageRating,
  };
}

interface IconProps {
  size: number;
  weight: "regular" | "fill" | "bold";
  "aria-hidden": boolean;
}

const ICON_SIZE = 18;

const LEVEL_ICONS: ReadonlyArray<{
  level: number;
  Icon: ComponentType<IconProps>;
}> = [
  { level: 1, Icon: ScalesIcon },
  { level: 2, Icon: CoffeeIcon },
  { level: 3, Icon: SmileyWinkIcon },
  { level: 4, Icon: LightningIcon },
  { level: 5, Icon: PepperIcon },
];

interface ToolReviewSummaryProps {
  data: ReviewSummaryData;
  isInteractive: boolean;
}

export function ToolReviewSummary({
  data,
  isInteractive,
}: ToolReviewSummaryProps) {
  const { sendMessage } = useChatActions();
  const locale = useLocale();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const spicinessLabels: Record<number, string> = {
    1: t({ en: "Mild", zh: "温和" }),
    2: t({ en: "Chill", zh: "平淡" }),
    3: t({ en: "Balanced", zh: "适中" }),
    4: t({ en: "Spicy", zh: "辛辣" }),
    5: t({ en: "Fire", zh: "火辣" }),
  };

  const confirmLabels: Record<number, string> = {
    1: t({ en: "Confirm Mild", zh: "确认温和" }),
    2: t({ en: "Confirm Chill", zh: "确认平淡" }),
    3: t({ en: "Confirm Balanced", zh: "确认适中" }),
    4: t({ en: "Confirm Spicy", zh: "确认辛辣" }),
    5: t({ en: "Confirm Fire", zh: "确认火辣" }),
  };

  function handleTap(level: number) {
    if (!isInteractive || level === data.spiciness) return;
    if (selectedLevel === level) {
      setSelectedLevel(null);
      const message =
        locale === "zh"
          ? `用辣度 ${level} 重新总结"${data.title}"的评论`
          : `Summarize reviews for "${data.title}" with spiciness level ${level}`;
      sendMessage(message);
    } else {
      setSelectedLevel(level);
    }
  }

  return (
    <div css={styles.card}>
      <div css={[flex.between, styles.header]}>
        <span css={styles.title}>
          {t({ en: "Review Summary", zh: "评论摘要" })}
        </span>
        <div css={[flex.row, styles.badges]}>
          {data.averageRating !== null && (
            <span css={styles.ratingBadge}>
              {"★ "}
              {data.averageRating}
            </span>
          )}
          <span css={styles.countBadge}>
            {data.reviewCount === 1
              ? t({ en: "1 review", zh: "1 条评论" })
              : `${data.reviewCount} ${t({ en: "reviews", zh: "条评论" })}`}
          </span>
        </div>
      </div>

      <p css={styles.summary}>{data.summary}</p>

      {isInteractive && (
        <div css={styles.controlSection}>
          <div css={[flex.row, styles.levelButtons]}>
            {LEVEL_ICONS.map(({ level, Icon }) => {
              const isCurrent = level === data.spiciness;
              const isSelected = level === selectedLevel;
              return (
                <button
                  key={level}
                  type="button"
                  css={[
                    buttonReset.base,
                    styles.levelButton,
                    isCurrent && styles.levelButtonCurrent,
                    isSelected && styles.levelButtonSelected,
                  ]}
                  onClick={() => handleTap(level)}
                  aria-label={
                    isSelected ? confirmLabels[level] : spicinessLabels[level]
                  }
                  aria-pressed={isCurrent}
                >
                  {isSelected ? (
                    <ArrowUpIcon
                      size={ICON_SIZE}
                      weight="bold"
                      aria-hidden={true}
                    />
                  ) : (
                    <Icon
                      size={ICON_SIZE}
                      weight={isCurrent ? "fill" : "regular"}
                      aria-hidden={true}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {selectedLevel !== null && (
            <p css={styles.selectedLabel} role="status">
              {spicinessLabels[selectedLevel]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  card: {
    backgroundColor: color.backgroundHover,
    borderRadius: border.radius_2,
    padding: space._3,
    marginTop: space._2,
  },
  header: {
    marginBottom: space._2,
  },
  title: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
  },
  badges: {
    gap: space._1,
  },
  ratingBadge: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
  },
  countBadge: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
    color: color.textMuted,
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_1,
    paddingInline: space._1,
    paddingBlock: space._00,
  },
  summary: {
    margin: 0,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
    whiteSpace: "pre-wrap",
  },
  controlSection: {
    marginTop: space._3,
    paddingTop: space._2,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
  levelButtons: {
    gap: space._1,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  levelButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._00,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: "transparent",
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  levelButtonCurrent: {
    backgroundColor: color.controlActive,
    color: color.textOnActive,
    borderColor: color.controlActive,
  },
  levelButtonSelected: {
    borderColor: color.controlActive,
    color: color.controlActive,
    backgroundColor: color.backgroundMain,
  },
  selectedLabel: {
    margin: 0,
    marginTop: space._1,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    textAlign: "center",
  },
});
