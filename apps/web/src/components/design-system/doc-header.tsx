import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";
import { LabViewSwitch } from "./lab/lab-view-switch.tsx";
import { measure } from "./measure.stylex.ts";
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
  /** The opening paragraph. The Lab view omits it. */
  description?: ReactNode;
}

/**
 * The header both of a route's views share: where the page sits, what it is
 * called, and — where the route has a Lab — the switch between the two views.
 */
export function DocHeader({ path, description }: DocHeaderProps) {
  return (
    <header css={styles.header}>
      <DocBreadcrumb path={path} />
      {/* Its own column: the trail is chrome above the page, and sharing the
          header's gap would set it as an over-line on the title. */}
      <div css={styles.intro}>
        <div css={styles.titleRow}>
          <h1 css={styles.title}>{getDesignSystemRouteLabel(path)}</h1>
          {hasDesignSystemLab(path) ? <LabViewSwitch docsPath={path} /> : null}
        </div>
        {description === undefined ? null : (
          <p css={styles.description}>{description}</p>
        )}
      </div>
    </header>
  );
}

const styles = stylex.create({
  header: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
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
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
