import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { border, ratio, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "../shared/skeleton";

const SKELETON_COUNT = 6;

interface RecommendedMediaRowSkeletonProps {
  inset?: "chat" | "standalone";
}

export function RecommendedMediaRowSkeleton({
  inset = "chat",
}: RecommendedMediaRowSkeletonProps = {}) {
  const rowStyle = inset === "standalone" ? styles.rowStandalone : styles.row;
  const cardStyle = inset === "standalone" ? styles.cardLarge : styles.card;
  return (
    <div css={styles.section}>
      <Skeleton width={120} height={14} />
      <div css={rowStyle}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} css={cardStyle}>
            <Skeleton fill delay={i * 100} />
          </div>
        ))}
      </div>
    </div>
  );
}

const chatInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const chatInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;

const standaloneInsetLeft = `calc(${space._3} + env(safe-area-inset-left, 0px))`;
const standaloneInsetRight = `calc(${space._3} + env(safe-area-inset-right, 0px))`;

const styles = stylex.create({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  row: {
    display: "flex",
    gap: space._2,
    overflow: "hidden",
    marginLeft: `calc(-1 * ${chatInsetLeft})`,
    marginRight: `calc(-1 * ${chatInsetRight})`,
    paddingLeft: chatInsetLeft,
    paddingRight: chatInsetRight,
  },
  rowStandalone: {
    display: "flex",
    gap: space._2,
    overflow: "hidden",
    marginLeft: `calc(-1 * ${standaloneInsetLeft})`,
    marginRight: `calc(-1 * ${standaloneInsetRight})`,
    paddingLeft: standaloneInsetLeft,
    paddingRight: standaloneInsetRight,
  },
  card: {
    flexShrink: 0,
    width: "130px",
    aspectRatio: ratio.poster,
    borderRadius: border.radius_2,
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
    borderRadius: border.radius_2,
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
