"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { usePageScrolled } from "../hooks/use-page-scrolled.ts";
import { flex } from "../primitives/flex.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { layer, space } from "../tokens.stylex.ts";
import { ProgressiveBlur } from "./progressive-blur.tsx";

// How far the page blurs past the group, and how strongly against it. A small
// radius, because the group is a handful of controls rather than a panel — but
// a long run-out relative to a control that is 40px tall, so the page reads as
// losing focus around the controls rather than wearing a ring.
const CONTROL_BLUR_REACH_PX = 64;
const CONTROL_BLUR_RADIUS_PX = 8;

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
    <ProgressiveBlur
      reach={CONTROL_BLUR_REACH_PX}
      radius={CONTROL_BLUR_RADIUS_PX}
      isShown={isScrolled}
      css={[flex.row, styles.floating, css]}
    >
      {children}
    </ProgressiveBlur>
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
    gap: space._1,
    zIndex: layer.header,
  },
});
