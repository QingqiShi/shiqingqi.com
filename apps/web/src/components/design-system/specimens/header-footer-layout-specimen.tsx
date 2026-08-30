import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component — same reason as the sidebar
 * shell: it owns the viewport and the `<main>` landmark. The diagram keeps what
 * separates the two shells, floating header controls and an optional footer
 * bracketing a reading column.
 */
export function HeaderFooterLayoutSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip]}>
      <div css={[styles.strip, styles.header]}>
        <div css={styles.group}>
          <WireframeBar width="1.25rem" />
        </div>
        <div css={styles.group}>
          <WireframeBar width="1.25rem" />
          <WireframeBar width="1.25rem" />
        </div>
      </div>
      <div css={styles.content}>
        <WireframeBar width="55%" strong />
        <WireframeBar width="80%" />
      </div>
      <div css={[styles.strip, styles.footer]}>
        <WireframeBar width="35%" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  strip: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
  },
  // Two small control groups floating at the ends of the measure: no fill and
  // no border, because the header is no longer a bar.
  header: {
    justifyContent: "space-between",
  },
  footer: {
    justifyContent: "center",
    marginBlockStart: "auto",
    backgroundColor: color.bgSurfaceRaised,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
  group: {
    display: "flex",
    gap: space._0,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});
