"use client";

import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";

const STAGGER_DELAY = 80;

export function ToolReviewSummarySkeleton() {
  return (
    <div css={[corner.radius_2, styles.card]}>
      <div css={styles.headerRow}>
        <Skeleton width={110} height={14} delay={0 * STAGGER_DELAY} />
        <Skeleton width={70} height={18} delay={1 * STAGGER_DELAY} />
      </div>
      <div css={stack.tight}>
        <Skeleton fill height={14} delay={2 * STAGGER_DELAY} />
        <Skeleton fill height={14} delay={3 * STAGGER_DELAY} />
        <Skeleton width={200} height={14} delay={4 * STAGGER_DELAY} />
      </div>
      <div css={styles.buttonsArea}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton
            key={i}
            width={40}
            height={36}
            delay={(5 + i) * STAGGER_DELAY}
          />
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  card: {
    backgroundColor: color.bgSurfaceRaised,
    padding: space._3,
    marginTop: rhythm.item,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rhythm.tight,
  },
  buttonsArea: {
    display: "flex",
    justifyContent: "center",
    gap: rhythm.tight,
    marginTop: rhythm.item,
    paddingTop: space._3,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
});
