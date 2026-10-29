"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";

const RANGES = [
  "5.25rem",
  "5.25rem",
  "2.5rem",
  "2.75rem",
  "2.875rem",
  "2.25rem",
  "4.125rem",
];
const SEGMENTED_CONTROLS = 3;
const RANKED_ROWS = 5;

/** `/finance/analytics` before it can show: the same title, controls, figures and charts, as blocks. */
export function AnalyticsSkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <Heading level={1} look="h3" css={styles.title}>
        {t({ en: "Analytics", zh: "分析" })}
      </Heading>
      <div css={stack.section}>
        <div css={stack.item}>
          <div css={cluster.tight}>
            {RANGES.map((width, index) => (
              <Skeleton
                key={index}
                width={width}
                css={[corner.radius_round, styles.range]}
              />
            ))}
          </div>
          <div css={styles.segmentedControls}>
            {Array.from({ length: SEGMENTED_CONTROLS }, (_, index) => (
              <Skeleton key={index} width="100%" css={styles.segmented} />
            ))}
          </div>
        </div>
        <div css={styles.columns}>
          <div css={stack.section}>
            <div css={stack.tight}>
              <Skeleton width="14rem" height="1rem" />
              <Skeleton width="9rem" height="1.8rem" />
              <Skeleton width="18rem" height="1.25rem" />
              <Skeleton width="16rem" height="1rem" />
            </div>
            <div css={stack.item}>
              <Skeleton width="7rem" height="1.3rem" />
              <Skeleton width="100%" height="15rem" />
            </div>
          </div>
          <div css={stack.section}>
            <div css={stack.item}>
              <Skeleton width="10rem" height="1.3rem" />
              <Skeleton width="100%" height="15rem" />
            </div>
            <div css={stack.item}>
              <Skeleton width="7rem" height="1.3rem" />
              <div css={stack.tight}>
                {Array.from({ length: RANKED_ROWS }, (_, index) => (
                  <Skeleton key={index} width="100%" height="2.25rem" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  title: {
    margin: 0,
  },
  range: {
    height: controlHeight.xs,
  },
  segmentedControls: {
    display: "grid",
    gap: rhythm.tight,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(auto-fit, minmax(14rem, 1fr))",
    },
  },
  segmented: {
    height: controlHeight.sm,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "repeat(2, minmax(0, 1fr))",
    },
    columnGap: rhythm.section,
    rowGap: rhythm.section,
    alignItems: "start",
  },
});
