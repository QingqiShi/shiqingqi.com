import * as stylex from "@stylexjs/stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than a bare `ProgressiveBlur`: the component paints
 * nothing on its own, only what it does to a page behind it and a floating
 * element in front of it, and neither reads at tile scale from real `Text`
 * and `Button`. The diagram carries the parts that matter — content blurring
 * progressively behind a raised action bar — using the real `ProgressiveBlur`
 * at a radius scaled to the tile.
 */
export function ProgressiveBlurSpecimen() {
  return (
    <div css={wireframe.page}>
      <div css={styles.content}>
        <WireframeBar width="70%" strong />
        <WireframeBar width="85%" />
        <WireframeBar width="55%" />
      </div>
      <ProgressiveBlur radius={6}>
        <div css={[corner.radius_2, styles.bar]}>
          <WireframeBar width="40%" strong />
        </div>
      </ProgressiveBlur>
    </div>
  );
}

const styles = stylex.create({
  content: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    padding: space._2,
  },
  bar: {
    position: "absolute",
    insetBlockEnd: space._1,
    insetInlineStart: space._1,
    insetInlineEnd: space._1,
    display: "flex",
    paddingBlock: space._1,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceRaised,
  },
});
