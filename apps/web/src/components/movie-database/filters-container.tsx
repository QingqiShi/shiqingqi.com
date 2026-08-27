import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { layer, layout, space } from "@tuja/ui/tokens.stylex";
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
  return (
    <>
      <div css={[styles.desktopContainer, styles.desktopVisible]}>
        <div css={styles.desktopInnerContainer}>
          <div css={[flex.row, styles.desktopContent]}>
            {desktopChildren}
            {trailingContent && (
              <div css={styles.trailingContent}>{trailingContent}</div>
            )}
          </div>
        </div>
      </div>
      <div css={[styles.mobileContainer, styles.mobileVisible]}>
        {mobileChildren}
        {trailingContent}
      </div>
    </>
  );
}

const styles = stylex.create({
  desktopVisible: {
    display: { default: "none", [breakpoints.md]: "flex" },
  },
  mobileVisible: {
    display: { default: "flex", [breakpoints.md]: "none" },
  },

  desktopContainer: {
    position: "sticky",
    top: `calc(${space._10} + env(safe-area-inset-top))`,
    // Sticky page chrome: above the cards it pins over (including one lifted by
    // hover), below the site header it parks beneath.
    zIndex: layer.raised,
    marginBottom: space._3,
  },
  desktopInnerContainer: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    display: "flex",
  },
  desktopContent: {
    flexGrow: 1,
    gap: space._1,
    // Without this the row is sized by its content and pushes past the
    // container, so nothing inside it ever shrinks.
    minInlineSize: 0,
  },

  mobileContainer: {
    position: "sticky",
    top: `calc(${space._10} + env(safe-area-inset-top))`,
    zIndex: layer.raised,
    alignItems: "center",
    gap: space._1,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    marginBottom: space._3,
  },

  trailingContent: {
    marginInlineStart: "auto",
    // Shrinkable so a crowded toolbar narrows the trailing content instead of
    // pushing the row wider than the container.
    minInlineSize: 0,
  },
});
