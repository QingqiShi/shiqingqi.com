import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * The avatar-and-lines shape skeletons are usually arranged into, trimmed to two
 * lines. The staggered delays stay, so that when the pulse does run it reads as
 * a wave rather than one flat blink.
 *
 * Holding it still until the tile is engaged is the plate's job, not this file's:
 * it sets `motionTokens.playState` and the pulse inherits it.
 */
export function SkeletonSpecimen() {
  return (
    <div css={[specimenLayout.fill, styles.row]}>
      <Skeleton
        width={36}
        height={36}
        css={[corner.radius_round, styles.avatar]}
      />
      <div css={styles.lines}>
        <Skeleton width="65%" height={10} />
        <Skeleton width="100%" height={10} delay={200} />
      </div>
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
  avatar: {
    flexShrink: 0,
  },
  lines: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: space._1,
  },
});
