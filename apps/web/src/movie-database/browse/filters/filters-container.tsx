import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { shrink } from "@tuja/ui/primitives/flex.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

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
  // A group of its own at the inline end, so the page between the filters and
  // it stays sharp.
  const trailingGroup = trailingContent && (
    <StickyControlGroup css={styles.trailingGroup}>
      {trailingContent}
    </StickyControlGroup>
  );

  return (
    <>
      <StickyControls css={[pageColumn.base, styles.bar, styles.desktop]}>
        {/* Never narrower than its controls, or their labels wrap onto a
            second line. The trailing group gives way instead. */}
        <StickyControlGroup css={shrink._0}>
          {desktopChildren}
        </StickyControlGroup>
        {trailingGroup}
      </StickyControls>
      <StickyControls css={[pageColumn.base, styles.bar, styles.mobile]}>
        <StickyControlGroup>{mobileChildren}</StickyControlGroup>
        {trailingGroup}
      </StickyControls>
    </>
  );
}

const styles = stylex.create({
  bar: {
    marginBlockEnd: rhythm.item,
  },

  desktop: {
    display: { default: "none", [breakpoints.md]: "flex" },
  },

  mobile: {
    display: { default: "flex", [breakpoints.md]: "none" },
  },

  trailingGroup: {
    marginInlineStart: "auto",
    // Shrinkable so a crowded toolbar narrows the trailing content instead of
    // pushing the row wider than the container.
    minInlineSize: 0,
  },
});
