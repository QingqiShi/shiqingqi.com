"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { ratio, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "../shared/skeleton";

const SKELETON_COUNT = 5;
const STAGGER_DELAY = 100;

export function ToolMediaCardsSkeleton() {
  return (
    <div css={styles.scrollWrapper}>
      <div css={styles.scrollContainer}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} css={styles.cardWrapper}>
            <Skeleton fill delay={i * STAGGER_DELAY} css={styles.skeleton} />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  scrollWrapper: {
    position: "relative",
    marginLeft: `calc(-1 * ${space._3})`,
    marginRight: `calc(-1 * ${space._3})`,
  },
  scrollContainer: {
    display: "flex",
    gap: space._2,
    overflowX: "hidden",
    paddingBottom: space._1,
    paddingLeft: space._3,
    paddingRight: space._3,
  },
  cardWrapper: {
    flexShrink: 0,
    width: "130px",
    aspectRatio: ratio.poster,
    [breakpoints.sm]: {
      width: "140px",
    },
    [breakpoints.md]: {
      width: "155px",
    },
    [breakpoints.lg]: {
      width: "175px",
    },
  },
  skeleton: {
    aspectRatio: ratio.poster,
  },
});
