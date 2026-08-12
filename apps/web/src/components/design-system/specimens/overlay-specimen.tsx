import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, shadow, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component: the real `Overlay` portals to a
 * fixed layer, traps focus, and locks scroll, none of which a tile can host.
 * The diagram carries the parts that matter — the scrim dimming the page and
 * the raised panel above it — using the same `bgScrim` and `shadow` tokens.
 */
export function OverlaySpecimen() {
  return (
    <div css={[wireframe.page, styles.page]}>
      <div css={styles.content}>
        <WireframeBar width="45%" strong />
        <WireframeBar width="80%" />
      </div>
      <div css={styles.scrim} />
      <div css={[corner.radius_2, styles.panel]}>
        <WireframeBar width="55%" strong />
        <WireframeBar width="85%" />
      </div>
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
  // The real scrim at full strength turns the miniature into a solid black
  // slab — the heaviest mark on the page, for the tile with the least to say.
  // Thinned to roughly 40% alpha (`bgScrim` is already 70%): still unmistakably
  // a dimmed page behind a panel, without shouting across the grid.
  scrim: {
    position: "absolute",
    inset: 0,
    backgroundColor: `color-mix(in srgb, ${color.bgScrim} 58%, transparent)`,
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
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._5,
  },
});
