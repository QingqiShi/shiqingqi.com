import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { justify } from "@tuja/ui/primitives/flex.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import type { ReactNode } from "react";
import { LabViewSwitch } from "#src/design-system/lab/lab-view-switch.tsx";
import { getDesignSystemRouteLabel } from "#src/design-system/route-copy/get-design-system-route-label.ts";
import { hasDesignSystemLab } from "#src/design-system/routes/has-design-system-lab.ts";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { DocBreadcrumb } from "./doc-breadcrumb.tsx";
import { readingColumn } from "./reading-column.stylex.ts";

interface DocHeaderProps {
  /**
   * The route this page is registered at. The title and the breadcrumb's
   * section both come from it, so a page cannot name itself something the sidebar
   * disagrees with.
   */
  path: DesignSystemPath;
  /** The opening paragraph, under the title. */
  description?: ReactNode;
}

/**
 * The header both of a route's views share: where the page sits, what it is
 * called, what it is about, and — where the route has a Lab — the switch
 * between the two views. `DocArticle` places it above the view. It is the same
 * in both views, so nothing in it moves when the view switches.
 */
export function DocHeader({ path, description }: DocHeaderProps) {
  return (
    <header css={[stack.item, styles.header]}>
      <DocBreadcrumb path={path} />
      <div data-prose css={stack.tight}>
        <div css={[cluster.item, justify.between]}>
          <Heading level={1} css={typeRole.subDisplay}>
            {getDesignSystemRouteLabel(path)}
          </Heading>
          {hasDesignSystemLab(path) ? <LabViewSwitch docsPath={path} /> : null}
        </div>
        {description == null ? null : <Text tone="muted">{description}</Text>}
      </div>
    </header>
  );
}

const styles = stylex.create({
  header: {
    maxInlineSize: readingColumn.inlineSize,
    marginInline: "auto",
  },
});
