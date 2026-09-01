import * as stylex from "@stylexjs/stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the real `StickyControls`: the component holds
 * at its offset only while the page scrolls under it, and a tile neither
 * scrolls nor may move — a live row would slide around inside the plate as the
 * overview scrolled, and would blur nothing until it happened to reach its
 * offset. The diagram stages the state worth seeing instead: a row of controls
 * parked over a page, with the page blurred around them, drawn with the real
 * `ProgressiveBlur` at a radius scaled to the tile.
 */
export function StickyControlsSpecimen() {
  return (
    <div css={wireframe.page}>
      {/* Every row strong: a plain bar carries the page's own border colour,
          and blurred at this size it dissolves into the page rather than
          softening against it. */}
      <div css={styles.content}>
        <WireframeBar width="82%" strong />
        <WireframeBar width="68%" strong />
        <WireframeBar width="88%" strong />
        <WireframeBar width="60%" strong />
        <WireframeBar width="76%" strong />
      </div>
      <ProgressiveBlur radius={5}>
        {/* The row itself has no fill: the blur is what separates it from the
            page. The two controls carry their own, because a real track and a
            real button do. */}
        <div css={styles.bar}>
          <div css={[corner.radius_1, styles.control, styles.track]} />
          <div css={[corner.radius_1, styles.control, styles.button]} />
        </div>
      </ProgressiveBlur>
    </div>
  );
}

const styles = stylex.create({
  // Fills the page and spreads the rows down it, so there is content under the
  // row as well as past both its ends.
  content: {
    display: "flex",
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "space-between",
    padding: space._1,
  },
  // Parked a little way down from the top edge, the clearance the real row
  // takes under the header strip.
  bar: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineStart: space._1,
    display: "flex",
    alignItems: "center",
    gap: space._0,
  },
  control: {
    blockSize: space._2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.neutralBorder}`,
  },
  // A segmented track and a single icon button, the pair the movie database's
  // own filter bar opens with.
  track: {
    inlineSize: "2.5rem",
  },
  button: {
    inlineSize: space._2,
  },
});
