"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { usePageScrolled } from "../../hooks/use-page-scrolled.ts";
import type { StyleProp } from "../../style-prop.ts";
import { layer, space } from "../../tokens.stylex.ts";
import { ControlGroupBlur } from "../surfaces/control-group-blur.tsx";

interface HeaderControlsProps {
  /** The controls in the group — a back affordance, a theme toggle, a picker. */
  children: ReactNode;
  /**
   * StyleX styles merged over the group's own — the escape hatch the shell
   * places the group with, since the shell owns the measure it aligns to.
   */
  css?: StyleProp;
}

/**
 * One floating group of a page shell's header controls: a fixed strip at the
 * top of the viewport, with the page blurred around it while scrolled.
 *
 * A group sits per end of the measure rather than one bar across the top,
 * because a near-full-width fixed element costs the browser's own
 * treatment — see "Progressive blur" in `CONTEXT.md`.
 *
 * @internal
 */
export function HeaderControls({ children, css }: HeaderControlsProps) {
  const { isScrolled } = usePageScrolled();

  return (
    <ControlGroupBlur isShown={isScrolled} css={[styles.floating, css]}>
      {children}
    </ControlGroupBlur>
  );
}

const styles = stylex.create({
  // The blur's root is already pointer-transparent, handing events back to
  // the controls, so this strip never blocks page scrolling beneath it.
  floating: {
    position: "fixed",
    insetBlockStart: "env(safe-area-inset-top)",
    blockSize: space._10,
    zIndex: layer.header,
  },
});
