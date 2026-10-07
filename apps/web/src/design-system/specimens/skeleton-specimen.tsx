import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
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
    <div css={[specimenLayout.fill, row.tight]}>
      <Skeleton
        width={36}
        height={36}
        css={[corner.radius_round, styles.avatar]}
      />
      <div css={[stack.tight, styles.lines]}>
        <Skeleton width="65%" height={10} />
        <Skeleton width="100%" height={10} delay={200} />
      </div>
    </div>
  );
}

const styles = stylex.create({
  avatar: {
    flexShrink: 0,
  },
  lines: {
    flexGrow: 1,
  },
});
