"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { FactorCheck } from "../risk/check-risk-policy.ts";
import { formatMetric } from "./format-metric.ts";
import { MarkdownText } from "./markdown-text.tsx";
import { RangeMeter } from "./range-meter.tsx";
import { StanceBadge } from "./stance-badge.tsx";
import { useMetricNames } from "./use-metric-names.ts";

const styles = stylex.create({
  head: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
  },
  facts: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
});

/**
 * One risk the fund takes a stance on: the stance first, then why, then
 * the target range against the number measured today.
 */
export function RiskFactorCard({ check }: { check: FactorCheck }) {
  const { factor, measured, inside, side, outsideBy } = check;
  const metricNames = useMetricNames();
  const metric = factor.metric;
  const fmt = (value: number) =>
    metric === null ? String(value) : formatMetric(metric, value);
  const range =
    factor.targetMin !== null && factor.targetMax !== null
      ? t({ en: "Target {min} to {max}", zh: "目标 {min} 至 {max}" })
          .replace("{min}", fmt(factor.targetMin))
          .replace("{max}", fmt(factor.targetMax))
      : factor.targetMin !== null
        ? t({ en: "Target at least {min}", zh: "目标至少 {min}" }).replace(
            "{min}",
            fmt(factor.targetMin),
          )
        : factor.targetMax !== null
          ? t({ en: "Target at most {max}", zh: "目标至多 {max}" }).replace(
              "{max}",
              fmt(factor.targetMax),
            )
          : t({ en: "No number to hit", zh: "没有数值目标" });

  let status: ReactNode;
  if (metric === null) {
    status = (
      <Badge size="sm" intent="neutral">
        {t({ en: "Judged by people", zh: "由人判断" })}
      </Badge>
    );
  } else if (inside === null || measured === null) {
    status = (
      <Badge size="sm" intent="neutral">
        {t({ en: "Not measured yet", zh: "尚未测量" })}
      </Badge>
    );
  } else if (inside) {
    status = (
      <Badge size="sm" intent="success">
        {t({ en: "Inside the range", zh: "在范围内" })}
      </Badge>
    );
  } else {
    status = (
      <Badge size="sm" intent="warning">
        {(side === "below"
          ? t({ en: "Below by {n}", zh: "低于目标 {n}" })
          : t({ en: "Above by {n}", zh: "高于目标 {n}" })
        ).replace("{n}", fmt(outsideBy ?? 0).replace(/^\+/, ""))}
      </Badge>
    );
  }

  return (
    <Card>
      <div css={stack.item}>
        <div css={styles.head}>
          <StanceBadge stance={factor.stance} />
          <Text as="p" look="body" weight="semibold" verbatim>
            {factor.name}
          </Text>
        </div>
        <MarkdownText>{factor.rationale}</MarkdownText>
        {metric === null ? null : (
          <div css={stack.tight}>
            <RangeMeter
              min={factor.targetMin}
              max={factor.targetMax}
              value={measured}
              inside={inside}
            />
            <div css={styles.facts}>
              <Text as="span" look="caption" tone="muted" numeric>
                {`${metricNames[metric]} · ${range}`}
                {measured === null
                  ? null
                  : t({
                      en: " · today {value}",
                      zh: " · 今天 {value}",
                    }).replace("{value}", fmt(measured))}
              </Text>
              <span css={cluster.inline}>{status}</span>
            </div>
          </div>
        )}
        {metric === null ? <span>{status}</span> : null}
      </div>
    </Card>
  );
}
