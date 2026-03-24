import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { border, ratio, space } from "#src/tokens.stylex.ts";
import { Skeleton } from "../shared/skeleton";

const SKELETON_COUNT = 6;

export function RecommendedMediaRowSkeleton() {
  return (
    <div css={styles.section}>
      <Skeleton width={120} height={14} />
      <div css={styles.row}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} css={styles.card}>
            <Skeleton fill delay={i * 100} />
          </div>
        ))}
      </div>
    </div>
  );
}

const contentInsetLeft = `calc(${space._3} + ${space._3} + env(safe-area-inset-left, 0px))`;
const contentInsetRight = `calc(${space._3} + ${space._3} + env(safe-area-inset-right, 0px))`;

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
    marginLeft: `calc(-1 * ${contentInsetLeft})`,
    marginRight: `calc(-1 * ${contentInsetRight})`,
    paddingLeft: contentInsetLeft,
    paddingRight: contentInsetRight,
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
});
