"use client";

import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";

const STAGGER_DELAY = 80;

export function ToolReviewSummarySkeleton() {
  return (
    <Card padding="sm" css={styles.card}>
      <div css={styles.headerRow}>
        <Skeleton width={110} height={14} delay={0 * STAGGER_DELAY} />
        <Skeleton width={70} height={18} delay={1 * STAGGER_DELAY} />
      </div>
      <div css={stack.tight}>
        <Skeleton fill height={14} delay={2 * STAGGER_DELAY} />
        <Skeleton fill height={14} delay={3 * STAGGER_DELAY} />
        <Skeleton width={200} height={14} delay={4 * STAGGER_DELAY} />
      </div>
      <Divider />
      <div css={styles.buttonsArea}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            key={i}
            width={controlHeight.sm}
            height={controlHeight.sm}
            shape="control"
            delay={(5 + i) * STAGGER_DELAY}
          />
        ))}
      </div>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    marginTop: rhythm.item,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonsArea: {
    display: "flex",
    justifyContent: "center",
    gap: rhythm.tight,
  },
});
