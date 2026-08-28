import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component — same reason as the sidebar
 * shell: it owns the viewport and the `<main>` landmark. The diagram keeps what
 * separates the two shells, a fixed header and an optional footer bracketing a
 * reading column.
 */
export function HeaderFooterLayoutSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip]}>
      <div css={[styles.bar, styles.header]}>
        <WireframeBar width="2.5rem" strong />
        <div css={styles.nav}>
          <WireframeBar width="1.25rem" />
          <WireframeBar width="1.25rem" />
        </div>
      </div>
      <div css={styles.content}>
        <WireframeBar width="55%" strong />
        <WireframeBar width="80%" />
      </div>
      <div css={[styles.bar, styles.footer]}>
        <WireframeBar width="35%" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  bar: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceRaised,
  },
  header: {
    justifyContent: "space-between",
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.neutralBorder,
  },
  footer: {
    justifyContent: "center",
    marginBlockStart: "auto",
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
  nav: {
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
