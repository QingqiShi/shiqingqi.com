import * as stylex from "@stylexjs/stylex";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than a bare `ProgressiveBlur`: the component paints
 * nothing on its own, only what it does to a page behind it and a floating
 * element in front of it, and neither reads at tile scale from real `Text`
 * and `Button`. The diagram carries the parts that matter — a page blurring
 * away on all four sides of a centred dialog, the case the page it links to
 * leads with — using the real `ProgressiveBlur` at a radius scaled to the tile.
 */
export function ProgressiveBlurSpecimen() {
  return (
    <div css={wireframe.page}>
      <div css={styles.content}>
        {/* All three strong, rather than a title bar over plain rows: a plain
            bar carries the page's own border colour, and blurred at this size
            it dissolves into the page rather than softening against it. */}
        <WireframeBar width="70%" strong />
        <WireframeBar width="84%" strong />
        <WireframeBar width="60%" strong />
      </div>
      <ProgressiveBlur radius={5}>
        <div css={[popoverSurface.base, styles.dialog]}>
          <WireframeBar width="60%" strong />
          <WireframeBar width="85%" />
        </div>
      </ProgressiveBlur>
    </div>
  );
}

const styles = stylex.create({
  // Fills the page and spreads the rows over it, so the ramp has content to
  // work on above and below the dialog as well as beside it.
  content: {
    display: "flex",
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    padding: space._1,
  },
  dialog: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    inlineSize: "52%",
    padding: space._0,
  },
});
