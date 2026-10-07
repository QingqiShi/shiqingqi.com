import * as stylex from "@stylexjs/stylex";
import { justify } from "@tuja/ui/primitives/flex.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { LabViewSwitch } from "#src/design-system/lab/lab-view-switch.tsx";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { hasDesignSystemLab } from "#src/design-system/routes/has-design-system-lab.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";
import { DocHeaderColumn, DocsViewOnly } from "./doc-header-column.tsx";
import { measure } from "./measure.stylex.ts";

interface DocHeaderProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the nav
   * rail disagrees with.
   */
  path: DesignSystemPath;
  /** The opening paragraph, under the title. The Lab view hides it. */
  description?: ReactNode;
}

/**
 * The header both of a route's views share: where the page sits, what it is
 * called, what it is about, and — where the route has a Lab — the switch
 * between the two views. `DocArticle` places it above the view. The description
 * belongs to the documentation view, so the Lab view hides it.
 */
export function DocHeader({ path, description }: DocHeaderProps) {
  return (
    <DocHeaderColumn docsPath={path}>
      <DocBreadcrumb path={path} />
      <div css={stack.tight}>
        <div css={[cluster.item, justify.between]}>
          <h1 css={styles.title}>{getDesignSystemRouteLabel(path)}</h1>
          {hasDesignSystemLab(path) ? <LabViewSwitch docsPath={path} /> : null}
        </div>
        {description == null ? null : (
          <DocsViewOnly docsPath={path}>
            <p css={styles.description}>{description}</p>
          </DocsViewOnly>
        )}
      </div>
    </DocHeaderColumn>
  );
}

const styles = stylex.create({
  title: {
    margin: 0,
    fontSize: font.uiSubDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
    color: color.fg,
    textWrap: "balance",
  },
  description: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.fgMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
