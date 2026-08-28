import * as stylex from "@stylexjs/stylex";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { specimenLayout } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * The real `ScrollMask`, with wireframed rows for content: the component paints
 * nothing of its own, only what it does to whatever scrolls under its edges,
 * and real copy at plate scale is too small to read as content leaving the
 * region. The rows overrun the box, so the end edge masks and the start edge —
 * with nothing scrolled past it yet — stays bare.
 */
export function ScrollMaskSpecimen() {
  return (
    <ScrollMask
      radius={6}
      depth={space._2}
      css={[corner.radius_2, specimenLayout.fill, styles.region]}
      contentCss={styles.content}
    >
      <WireframeBar width="70%" strong />
      <WireframeBar width="85%" />
      <WireframeBar width="55%" />
      <WireframeBar width="78%" />
      <WireframeBar width="62%" />
      <WireframeBar width="88%" />
    </ScrollMask>
  );
}

const styles = stylex.create({
  region: {
    blockSize: space._9,
    // No clip: the bands take the root's corners themselves, and a
    // squircle-cornered clip above them makes Chrome drop their masks.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    // Lighter than the sunken plate it sits on, in both themes, so the region
    // reads as lying on the plate rather than dissolving into it.
    backgroundColor: color.bgSurface,
  },
  // Grid, not a flex column: the scroller has a definite height, and flex would
  // shrink these empty rows — whose min-content height is zero — until nothing
  // was left to overrun the box or to blur.
  content: {
    display: "grid",
    alignContent: "start",
    gap: space._0,
    padding: space._2,
  },
});
