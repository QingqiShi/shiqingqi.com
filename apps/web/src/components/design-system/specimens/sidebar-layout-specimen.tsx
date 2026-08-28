import * as stylex from "@stylexjs/stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { wireframe } from "./specimen.stylex.ts";
import { WireframeBar } from "./wireframe-bar.tsx";

/**
 * A miniature page rather than the component: the real `SidebarLayout` claims
 * the viewport and supplies the `<main>` landmark, so a second one inside a
 * tile would fight the page it sits on. The diagram keeps the shell's defining
 * move — a sunken rail pinned beside a capped content column.
 */
export function SidebarLayoutSpecimen() {
  return (
    <div css={[wireframe.page, wireframe.clip, styles.page]}>
      <div css={styles.rail}>
        <WireframeBar width="70%" strong css={styles.railTitle} />
        <WireframeBar width="85%" />
        <WireframeBar width="85%" />
      </div>
      <div css={styles.content}>
        <WireframeBar width="50%" strong />
        <div css={styles.grid}>
          <div css={[corner.radius_1, styles.tile]} />
          <div css={[corner.radius_1, styles.tile]} />
        </div>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The one shell laid out across rather than down, so it opts out of the
  // wireframe's column default.
  page: {
    flexDirection: "row",
  },
  rail: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    gap: space._0,
    inlineSize: "30%",
    padding: space._1,
    borderInlineEndWidth: border.size_1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  railTitle: { marginBlockEnd: space._0 },
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: space._1,
    padding: space._1,
  },
  grid: {
    display: "grid",
    flexGrow: 1,
    gridTemplateColumns: "1fr 1fr",
    gap: space._0,
  },
  tile: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
});
