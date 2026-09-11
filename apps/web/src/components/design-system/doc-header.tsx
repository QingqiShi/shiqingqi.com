import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";
import { DocHeaderColumn } from "./doc-header-column.tsx";
import { LabViewSwitch } from "./lab/lab-view-switch.tsx";
import { getDesignSystemRouteLabel } from "./route-copy/get-design-system-route-label.ts";
import { hasDesignSystemLab } from "./routes/has-design-system-lab.ts";
import type { DesignSystemPath } from "./routes/types.ts";

interface DocHeaderProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
}

/**
 * The header both of a route's views share: where the page sits, what it is
 * called, and — where the route has a Lab — the switch between the two views.
 * `DocArticle` places it above the view. The description belongs to the
 * documentation view, so it sits below, in `DocPage`.
 */
export function DocHeader({ path }: DocHeaderProps) {
  return (
    <DocHeaderColumn docsPath={path}>
      <DocBreadcrumb path={path} />
      <div css={styles.titleRow}>
        <h1 css={styles.title}>{getDesignSystemRouteLabel(path)}</h1>
        {hasDesignSystemLab(path) ? <LabViewSwitch docsPath={path} /> : null}
      </div>
    </DocHeaderColumn>
  );
}

const styles = stylex.create({
  // The switch shares the title's line where the two fit, and takes a line of
  // its own under a long title.
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._3,
  },
  title: {
    margin: 0,
    fontSize: font.uiSubDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    color: color.textMain,
    textWrap: "balance",
  },
});
