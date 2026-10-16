import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component: the real `Sheet` portals to a
 * fixed layer, traps focus, and locks scroll, none of which a tile can host.
 * The diagram carries the parts that matter — the page dimmed behind a card
 * that floats at the bottom, inset from the edges, with its grabber on top.
 */
export function SheetSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip]}>
      <div css={[stack.tight, styles.content]}>
        <WireframeBar width="45%" strong />
        <WireframeBar width="80%" />
        <WireframeBar width="65%" />
      </div>
      <div css={styles.dim} />
      <div css={[corner.radius_1, styles.card]}>
        <span css={[corner.radius_round, styles.grabber]} />
        <WireframeBar width="55%" strong />
        <WireframeBar width="85%" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  content: {
    padding: space._2,
  },
  dim: {
    position: "absolute",
    inset: 0,
    backgroundColor: color.bgDim,
  },
  // Inset by `space._0` from a page cornered at `radius_2`, so its own corner
  // is the step below.
  card: {
    position: "absolute",
    insetInline: space._0,
    insetBlockEnd: space._0,
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.bgSurface,
  },
  grabber: {
    alignSelf: "center",
    inlineSize: space._5,
    blockSize: space._00,
    backgroundColor: color.bgNeutral,
  },
});
