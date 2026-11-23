"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import type { PositionThesisView } from "../views/load-thesis.ts";
import { MarkdownText } from "./markdown-text.tsx";

const styles = stylex.create({
  list: {
    margin: 0,
    paddingInlineStart: space._4,
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
  },
});

function Points({
  title,
  points,
}: {
  title: string;
  points: readonly string[];
}) {
  if (points.length === 0) return null;
  return (
    <div css={stack.tight}>
      <Text as="p" look="label" tone="muted">
        {title}
      </Text>
      <ul css={[styles.list, typeModifier.verbatim]}>
        {points.map((point) => (
          <Text key={point} as="li" look="bodySmall">
            {point}
          </Text>
        ))}
      </ul>
    </div>
  );
}

/** Why the fund owns one stock, and what would prove it wrong. */
export function PositionThesisCard({ thesis }: { thesis: PositionThesisView }) {
  const { body } = thesis;
  return (
    <Card>
      <div css={stack.item}>
        <CardHeader
          action={
            thesis.status === "invalidated" ? (
              <Badge size="sm" intent="destructive">
                {t({ en: "Proved wrong", zh: "已被证伪" })}
              </Badge>
            ) : thesis.status === "closed" ? (
              <Badge size="sm" intent="neutral">
                {t({ en: "Closed", zh: "已结束" })}
              </Badge>
            ) : (
              <Badge size="sm" intent="neutral">
                {t({ en: "{n} months", zh: "{n} 个月" }).replace(
                  "{n}",
                  String(body.horizonMonths),
                )}
              </Badge>
            )
          }
        >
          <CardTitle level={3}>{thesis.symbol}</CardTitle>
          <CardDescription>{thesis.name}</CardDescription>
        </CardHeader>
        <MarkdownText>{body.summary}</MarkdownText>
        <Points
          title={t({ en: "What drives it", zh: "驱动因素" })}
          points={body.drivers}
        />
        <Points
          title={t({ en: "What would prove it wrong", zh: "什么会证明它错了" })}
          points={body.invalidation}
        />
        <div css={stack.tight}>
          <Text as="p" look="label" tone="muted">
            {t({ en: "Valuation", zh: "估值" })}
          </Text>
          <MarkdownText>{body.valuation}</MarkdownText>
        </div>
        {thesis.changeNote === null ? null : (
          <Text as="p" look="caption" tone="muted" verbatim>
            {t({ en: "Version {n}: ", zh: "第 {n} 版：" }).replace(
              "{n}",
              String(thesis.version),
            )}
            {thesis.changeNote}
          </Text>
        )}
      </div>
    </Card>
  );
}
