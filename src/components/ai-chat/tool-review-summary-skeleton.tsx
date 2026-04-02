"use client";

import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "../shared/skeleton";

const STAGGER_DELAY = 80;

export function ToolReviewSummarySkeleton() {
  return (
    <div css={styles.card}>
      <div css={styles.headerRow}>
        <Skeleton width={110} height={14} delay={0 * STAGGER_DELAY} />
        <Skeleton width={70} height={18} delay={1 * STAGGER_DELAY} />
      </div>
      <div css={styles.summaryLines}>
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
    backgroundColor: color.backgroundHover,
    borderRadius: border.radius_2,
    padding: space._3,
    marginTop: space._2,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space._2,
  },
  summaryLines: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  buttonsArea: {
    display: "flex",
    justifyContent: "center",
    gap: space._1,
    marginTop: space._3,
    paddingTop: space._2,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
});
