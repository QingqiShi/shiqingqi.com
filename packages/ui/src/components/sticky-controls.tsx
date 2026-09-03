"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { useStuck } from "../hooks/use-stuck.ts";
import type { StyleProp } from "../style-prop.ts";
import { layer, space } from "../tokens.stylex.ts";
import { StuckContext } from "./sticky-control-group.tsx";

export { StickyControlGroup } from "./sticky-control-group.tsx";

interface StickyControlsProps {
  /** The row's groups — a `StickyControlGroup` per cluster of controls. */
  children: ReactNode;
  /**
   * StyleX styles merged over the sticky row's own. Measure, padding, margins,
   * and breakpoint belong to the consumer; this component only parks itself
   * and lays out its groups.
   */
  css?: StyleProp;
}

/**
 * One row of sticky page chrome — a filter bar — parked under the header
 * strip, blurring the page around each group of its controls while it holds.
 *
 * A blur per group rather than one across the row, so two groups side by
 * side — filters at the start, a prompt at the end — leave the page between
 * them sharp, the way the header's own groups do.
 */
export function StickyControls({ children, css }: StickyControlsProps) {
  const { ref, isStuck } = useStuck();

  return (
    <StuckContext value={isStuck}>
      <div ref={ref} css={[styles.sticky, css]}>
        {children}
      </div>
    </StuckContext>
  );
}

const styles = stylex.create({
  // Sticky at `raised`, above the cards it pins over (including one lifted by
  // hover), and below the header it parks beneath. The small gap keeps two
  // groups reading as one cluster rather than spanning the row.
  sticky: {
    position: "sticky",
    insetBlockStart: "var(--header-controls-clearance, 0px)",
    zIndex: layer.raised,
    display: "flex",
    gap: space._1,
  },
});
