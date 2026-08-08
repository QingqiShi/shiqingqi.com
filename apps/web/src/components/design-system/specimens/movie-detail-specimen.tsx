import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, ratio, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature of the composed screen, for the same reason the two page shells
 * get one: the subject is a whole page, and a whole page does not survive being
 * shrunk into a tile — at plate size the real screen is an unreadable smear of
 * six regions rather than a specimen of anything.
 *
 * So the tile shows the screen's silhouette instead: the poster block beside the
 * title lockup, a row of Genre chips, and the view switch under a rule. It is
 * drawn from the same tokens as the screen, so it tracks the system's surfaces
 * and borders even though it isn't the screen.
 */
export function MovieDetailSpecimen() {
  return (
    <div css={[wireframe.page, styles.page]}>
      <div css={styles.hero}>
        <div css={[corner.radius_1, styles.poster]} />
        <div css={styles.identity}>
          <WireframeBar width="35%" />
          <WireframeBar width="80%" strong />
          <WireframeBar width="60%" />
          {/* Chips and view segments are `WireframeBar`s too — its two fills are
              the ones chosen to survive the plate's desaturation, so re-declaring
              them here would leave this specimen behind the next time they move.
              Only the taller box and the pill radius are local. */}
          <div css={styles.chips}>
            <WireframeBar
              width="0.75rem"
              css={[corner.radius_round, styles.chip]}
            />
            <WireframeBar
              width="0.75rem"
              css={[corner.radius_round, styles.chip]}
            />
            <WireframeBar
              width="0.75rem"
              css={[corner.radius_round, styles.chip]}
            />
          </div>
        </div>
      </div>
      <div css={styles.views}>
        <WireframeBar width="1rem" strong css={styles.segment} />
        <WireframeBar width="1rem" css={styles.segment} />
        <WireframeBar width="1rem" css={styles.segment} />
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: {
    gap: space._1,
    padding: space._2,
  },
  hero: {
    display: "flex",
    alignItems: "flex-start",
    gap: space._1,
  },
  poster: {
    flexShrink: 0,
    aspectRatio: ratio.poster,
    inlineSize: "22%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: space._0,
    minInlineSize: 0,
  },
  chips: {
    display: "flex",
    gap: space._00,
    marginBlockStart: space._00,
  },
  chip: {
    blockSize: space._1,
  },
  // Pinned to the foot of the miniature, under the hero, the way the real
  // screen's view switch sits below the fold of its hero.
  views: {
    display: "flex",
    gap: space._00,
    marginBlockStart: "auto",
    paddingBlockStart: space._1,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
  segment: {
    blockSize: space._1,
  },
});
