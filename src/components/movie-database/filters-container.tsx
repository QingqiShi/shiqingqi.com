import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { layer, space } from "@/tokens.stylex";

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
          <div css={styles.desktopContent}>{desktopChildren}</div>
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
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  mobileVisible: {
    display: { default: "inline-flex", [breakpoints.md]: "none" },
  },

  desktopContainer: {
    position: "fixed",
    top: `calc(${space._10} + env(safe-area-inset-top))`,
    right: 0,
    left: 0,
    zIndex: layer.overlay,
    pointerEvents: "none",
    paddingRight: "var(--removed-body-scroll-bar-size, 0px)",
  },
  desktopInnerContainer: {
    width: "100%",
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    pointerEvents: "none",
    display: "flex",
  },
  desktopContent: {
    pointerEvents: "all",
    display: "flex",
    alignItems: "center",
    gap: space._1,
  },

  mobileContainer: {
    position: "fixed",
    right: `calc(${space._3} + var(--removed-body-scroll-bar-size, 0px))`,
    top: `calc(${space._10} + env(safe-area-inset-top))`,
    zIndex: layer.overlay,
  },
});
