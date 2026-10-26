import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm, space } from "@tuja/ui/tokens.stylex";
import { CHART_HEIGHT } from "./account-chart.tsx";

/** `AccountChart` before it draws: the range, the range picker and the drawing, as blocks of the same size. */
export function AccountChartSkeleton() {
  return (
    <div aria-busy css={stack.tight}>
      <div css={styles.readoutRow}>
        <div css={styles.readout}>
          <Skeleton width="11rem" height=".875rem" />
        </div>
        <Skeleton css={[corner.radius_3, styles.chips]} />
      </div>
      <Skeleton width="100%" height={CHART_HEIGHT} />
    </div>
  );
}

const styles = stylex.create({
  readoutRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
  },
  readout: {
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    minBlockSize: space._5,
  },
  chips: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "18rem",
    minInlineSize: 0,
    maxInlineSize: "24rem",
    blockSize: controlHeight.sm,
  },
});
