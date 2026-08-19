import * as stylex from "@stylexjs/stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component: the real `Overlay` portals to a
 * fixed layer, traps focus, and locks scroll, none of which a tile can host.
 * The diagram carries the parts that matter — the page blurring progressively
 * behind the raised panel rather than dimming — using the real
 * `ProgressiveBlur` at a radius scaled to the tile.
 */
export function OverlaySpecimen() {
  return (
    <div css={[wireframe.page, styles.page]}>
      <div css={styles.content}>
        <WireframeBar width="45%" strong />
        <WireframeBar width="80%" />
      </div>
      <ProgressiveBlur radius={6}>
        <div css={[corner.radius_2, styles.panel]}>
          <WireframeBar width="55%" strong />
          <WireframeBar width="85%" />
        </div>
      </ProgressiveBlur>
    </div>
  );
}

const styles = stylex.create({
  page: {
    justifyContent: "center",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    padding: space._2,
  },
  panel: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    inlineSize: "62%",
    paddingBlock: space._2,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceRaised,
  },
});
