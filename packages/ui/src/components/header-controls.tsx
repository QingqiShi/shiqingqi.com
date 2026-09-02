"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { usePageScrolled } from "../hooks/use-page-scrolled.ts";
import type { StyleProp } from "../style-prop.ts";
import { layer, space } from "../tokens.stylex.ts";
import { ControlGroupBlur } from "./control-group-blur.tsx";

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
 * top of the viewport, with the page blurred around it — strongest against the
 * controls, sharp again a little way out. It melts away while the page rests
 * at the top, where nothing has scrolled beneath the controls yet, so a hero
 * bleeds to the top edge untouched.
 *
 * A group per end of the measure rather than one bar across the top, because a
 * near-full-width fixed element at the top edge costs the browser's own
 * treatment of it — see "Progressive blur" in `CONTEXT.md`.
 *
 * Promote it when a second shell floats its chrome.
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
  // Fixed against the viewport, in a strip below the safe area as tall as the
  // clearance a text page pads for. The blur's root is already
  // pointer-transparent and its slot hands pointer events back to the
  // controls, so the strip never blocks the page scrolling under it.
  floating: {
    position: "fixed",
    insetBlockStart: "env(safe-area-inset-top)",
    blockSize: space._10,
    zIndex: layer.header,
  },
});
