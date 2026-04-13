import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { layer, layout, space } from "#src/tokens.stylex.ts";

interface FiltersContainerProps {
  desktopChildren?: ReactNode;
  mobileChildren?: ReactNode;
}

export function FiltersContainer({
  desktopChildren,
  mobileChildren,
}: FiltersContainerProps) {
  return (
    <>
      <div css={[styles.desktopContainer, styles.desktopVisible]}>
        <div css={styles.desktopInnerContainer}>
          <div css={[flex.row, styles.desktopContent]}>{desktopChildren}</div>
        </div>
      </div>
      <div css={[styles.mobileContainer, styles.mobileVisible]}>
        {mobileChildren}
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
    zIndex: layer.overlay,
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
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
    gap: space._1,
  },

  mobileContainer: {
    position: "sticky",
    top: `calc(${space._10} + env(safe-area-inset-top))`,
    zIndex: layer.overlay,
    justifyContent: "space-between",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right, 0px) + var(--removed-body-scroll-bar-size, 0px))`,
    marginBottom: space._3,
  },
});
