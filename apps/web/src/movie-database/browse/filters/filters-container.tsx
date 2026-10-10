import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { shrink } from "@tuja/ui/primitives/flex.stylex";
import type { ReactNode } from "react";
import { gutterBleed } from "#src/movie-database/gutter-bleed.stylex.ts";

interface FiltersContainerProps {
  desktopChildren?: ReactNode;
  mobileChildren?: ReactNode;
  trailingContent?: ReactNode;
}

export function FiltersContainer({
  desktopChildren,
  mobileChildren,
  trailingContent,
}: FiltersContainerProps) {
  const trailingGroup = trailingContent && (
    <StickyControlGroup css={styles.trailingGroup}>
      {trailingContent}
    </StickyControlGroup>
  );

  return (
    <>
      <StickyControls css={styles.desktop}>
        {/* Never narrower than its controls, or their labels wrap onto a
            second line. The trailing group gives way instead. */}
        <StickyControlGroup css={shrink._0}>
          {desktopChildren}
        </StickyControlGroup>
        {trailingGroup}
      </StickyControls>
      <StickyControls css={[gutterBleed.base, styles.mobile]}>
        <StickyControlGroup>{mobileChildren}</StickyControlGroup>
        {trailingGroup}
      </StickyControls>
    </>
  );
}

const styles = stylex.create({
  desktop: {
    display: { default: "none", [breakpoints.md]: "flex" },
    minInlineSize: 0,
  },

  // A line of its own, because the AI button sits out of flow at its end. It
  // steps out to the screen edges, so that the Refine sheet, which spans the
  // bar, keeps one gutter from them.
  mobile: {
    display: { default: "flex", [breakpoints.md]: "none" },
    flexGrow: 1,
    flexBasis: "100%",
  },

  trailingGroup: {
    // Shrinkable so a crowded toolbar narrows the trailing content instead of
    // pushing the row wider than the container.
    minInlineSize: 0,
  },
});
