import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

const ROWS = 3;

/**
 * A miniature page rather than the component: the real `NavigationStack` is
 * as tall as the screen. The diagram shows a screen of one page with the way
 * back at its top.
 */
export function NavigationStackSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip, styles.page]}>
      <span css={styles.back}>
        <span css={[corner.radius_1, styles.caret]} />
        <WireframeBar width="22%" />
      </span>
      <WireframeBar width="50%" strong />
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} css={[corner.radius_1, styles.row]}>
          <WireframeBar width="45%" />
          <WireframeBar width="18%" />
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  page: {
    gap: rhythm.inline,
    padding: space._1,
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    marginBlockEnd: rhythm.inline,
  },
  caret: {
    flexShrink: 0,
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.input,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: space._00,
    backgroundColor: color.muted,
  },
});
