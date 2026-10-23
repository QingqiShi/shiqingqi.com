import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

const STRIP_ITEMS = 4;
const ROWS = 4;

/**
 * A miniature page rather than the component: the real
 * `NavigationSplitView` is as tall as the screen and reads the URL. The
 * diagram shows its defining move — the detail open beside the content,
 * with the sidebar folded to the collapsed sidebar.
 */
export function NavigationSplitViewSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip, styles.page]}>
      <div css={styles.strip}>
        {Array.from({ length: STRIP_ITEMS }, (_, index) => (
          <span
            key={index}
            css={[
              corner.radius_1,
              styles.stripItem,
              index === 1 && styles.picked,
            ]}
          />
        ))}
      </div>
      <div css={styles.content}>
        <WireframeBar width="30%" />
        <WireframeBar width="55%" strong />
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            css={[corner.radius_1, styles.row, index === 1 && styles.picked]}
          >
            <WireframeBar width="45%" />
            <WireframeBar width="18%" />
          </div>
        ))}
      </div>
      <div css={styles.detail}>
        <div css={styles.detailHeader}>
          <WireframeBar width="45%" />
          <span css={[corner.radius_1, styles.close]} />
        </div>
        <WireframeBar width="60%" strong />
        <WireframeBar width="85%" />
        <WireframeBar width="85%" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  page: {
    flexDirection: "row",
  },
  strip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    gap: rhythm.inline,
    inlineSize: "1.25rem",
    paddingBlock: space._1,
    borderInlineEndWidth: border.size_1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
  },
  stripItem: {
    inlineSize: space._2,
    blockSize: space._2,
    backgroundColor: color.border,
  },
  picked: {
    backgroundColor: color.bgControlSelected,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: rhythm.inline,
    padding: space._1,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: space._00,
  },
  detail: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: rhythm.inline,
    inlineSize: "36%",
    padding: space._1,
    borderInlineStartWidth: border.size_1,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: color.border,
    backgroundColor: color.bgSurfaceRaised,
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBlockEnd: rhythm.inline,
  },
  close: {
    inlineSize: space._1,
    blockSize: space._1,
    backgroundColor: color.bgNeutral,
  },
});
