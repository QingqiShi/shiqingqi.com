"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { CoffeeIcon } from "@phosphor-icons/react/dist/ssr/Coffee";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { PepperIcon } from "@phosphor-icons/react/dist/ssr/Pepper";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import { SmileyWinkIcon } from "@phosphor-icons/react/dist/ssr/SmileyWink";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ComponentType } from "react";
import { useState } from "react";
import { useChatActions } from "#src/movie-database/chat/chat-actions-context.tsx";
import { isRecord } from "#src/movie-database/is-record.ts";

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
  weight: "regular" | "fill" | "bold";
  "aria-hidden": boolean;
}

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

  const ratingFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  });
  const formattedRating =
    data.averageRating !== null
      ? ratingFormatter.format(data.averageRating)
      : null;

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
          ? `用辣度 ${String(level)} 重新总结"${data.title}"的评论`
          : `Summarize reviews for "${data.title}" with spiciness level ${String(level)}`;
      sendMessage(message);
    } else {
      setSelectedLevel(level);
    }
  }

  return (
    <Card padding="sm" css={styles.card}>
      <div css={flex.between}>
        <Text as="span" look="label" weight="semibold">
          {t({ en: "Review Summary", zh: "评论摘要" })}
        </Text>
        <div css={row.tight}>
          {formattedRating !== null && (
            <span
              role="img"
              aria-label={`${t({ en: "Average rating", zh: "平均评分" })}: ${formattedRating}${t({ en: " out of 10", zh: "/10" })}`}
            >
              <Text as="span" look="label" tone="muted">
                <span aria-hidden="true">{`★ ${formattedRating}`}</span>
              </Text>
            </span>
          )}
          <Badge intent="neutral" size="sm">
            {data.reviewCount === 1
              ? t({ en: "1 review", zh: "1 条评论" })
              : `${String(data.reviewCount)} ${t({ en: "reviews", zh: "条评论" })}`}
          </Badge>
        </div>
      </div>

      <Text measure="none" css={styles.summary}>
        {data.summary}
      </Text>

      {isInteractive && (
        <>
          <Divider />
          <div>
            <div css={[flex.row, styles.levelButtons]}>
              {LEVEL_ICONS.map(({ level, Icon }) => {
                const isCurrent = level === data.spiciness;
                const isSelected = level === selectedLevel;
                return (
                  <Button
                    key={level}
                    look="ghost"
                    size="sm"
                    isActive={isSelected}
                    onClick={() => {
                      handleTap(level);
                    }}
                    aria-label={
                      isSelected ? confirmLabels[level] : spicinessLabels[level]
                    }
                    aria-current={isCurrent ? "true" : undefined}
                    aria-pressed={isSelected}
                    icon={
                      isSelected ? (
                        <ArrowUpIcon weight="bold" aria-hidden={true} />
                      ) : (
                        <Icon
                          weight={isCurrent ? "fill" : "regular"}
                          aria-hidden={true}
                        />
                      )
                    }
                  />
                );
              })}
            </div>
            {selectedLevel !== null && (
              <p css={styles.selectedLabel} role="status">
                <Text as="span" look="bodySmall" tone="muted">
                  {spicinessLabels[selectedLevel]}
                </Text>
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

const styles = stylex.create({
  card: {
    marginTop: rhythm.item,
  },
  summary: {
    whiteSpace: "pre-wrap",
  },
  levelButtons: {
    justifyContent: "center",
    flexWrap: "wrap",
    gap: rhythm.tight,
  },
  selectedLabel: {
    margin: 0,
    marginTop: rhythm.tight,
    textAlign: "center",
  },
});
