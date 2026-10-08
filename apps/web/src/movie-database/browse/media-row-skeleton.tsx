import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { pageColumn, pageGutter } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { ratio, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { MediaRowInset } from "./media-row.tsx";

const SKELETON_COUNT = 14;

interface MediaRowSkeletonProps {
  inset?: MediaRowInset;
}

export function MediaRowSkeleton({
  inset = "chat",
}: MediaRowSkeletonProps = {}) {
  const isStandalone = inset === "standalone";
  return (
    <div css={stack.tight}>
      <div css={isStandalone && pageColumn.base}>
        <Skeleton width={220} height={16} />
      </div>
      <div css={[styles.row, isStandalone ? pageColumn.base : styles.rowChat]}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div
            key={i}
            css={[
              corner.radius_2,
              isStandalone ? styles.cardLarge : styles.card,
            ]}
          >
            <Skeleton fill delay={i * 100} />
          </div>
        ))}
      </div>
    </div>
  );
}

const chatInsetStart = `calc(${space._3} + ${pageGutter.inlineStart})`;
const chatInsetEnd = `calc(${space._3} + ${pageGutter.inlineEnd})`;

const styles = stylex.create({
  row: {
    display: "flex",
    gap: rhythm.item,
    overflow: "hidden",
    paddingBlockEnd: space._1,
  },
  rowChat: {
    marginInlineStart: `calc(-1 * ${chatInsetStart})`,
    marginInlineEnd: `calc(-1 * ${chatInsetEnd})`,
    paddingInlineStart: chatInsetStart,
    paddingInlineEnd: chatInsetEnd,
  },
  card: {
    flexShrink: 0,
    width: "130px",
    aspectRatio: ratio.poster,
    overflow: "hidden",
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
  cardLarge: {
    flexShrink: 0,
    width: "150px",
    aspectRatio: ratio.poster,
    overflow: "hidden",
    [breakpoints.sm]: {
      width: "175px",
    },
    [breakpoints.md]: {
      width: "210px",
    },
    [breakpoints.lg]: {
      width: "240px",
    },
  },
});
