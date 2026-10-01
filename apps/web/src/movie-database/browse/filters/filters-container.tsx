import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { shrink } from "@tuja/ui/primitives/flex.stylex";
import { layout, space } from "@tuja/ui/tokens.stylex";
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
      <StickyControls css={[styles.bar, styles.desktop]}>
        {/* Never narrower than its controls, or their labels wrap onto a
            second line. The trailing group gives way instead. */}
        <StickyControlGroup css={shrink._0}>
          {desktopChildren}
        </StickyControlGroup>
        {trailingGroup}
      </StickyControls>
      <StickyControls css={[styles.bar, styles.mobile]}>
        <StickyControlGroup>{mobileChildren}</StickyControlGroup>
        {trailingGroup}
      </StickyControls>
    </>
  );
}

const styles = stylex.create({
  // Whichever bar is shown, it keeps the reading gutters clear of the safe area
  // and the same gap to the content under it.
  bar: {
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    marginBottom: space._3,
  },

  // The site measure, so the bar lines up with the content it filters.
  desktop: {
    display: { default: "none", [breakpoints.md]: "flex" },
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
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
