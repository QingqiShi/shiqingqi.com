"use client";

import * as stylex from "@stylexjs/stylex";
import { createContext, use, type ReactNode } from "react";
import { useStuck } from "../hooks/use-stuck.ts";
import type { StyleProp } from "../style-prop.ts";
import { layer, space } from "../tokens.stylex.ts";
import { ControlGroupBlur } from "./control-group-blur.tsx";

// Whether the row is holding at its offset, read by every group in it so they
// all blur and melt together.
const StuckContext = createContext(false);

interface StickyControlsProps {
  /** The row's groups — a `StickyControlGroup` per cluster of controls. */
  children: ReactNode;
  /**
   * StyleX styles merged over the sticky row's own. The row's measure, padding,
   * margins and the breakpoint it shows at belong to the consumer; the row only
   * parks itself and lays its groups out.
   */
  css?: StyleProp;
}

/**
 * One row of sticky page chrome — a filter bar — parked under the header
 * strip, with the page blurred around each group of its controls while it
 * holds there. It melts away as soon as the row scrolls back into the flow of
 * the page.
 *
 * A blur per group rather than one across the row, so a row with a group at
 * each end — filters at the start, a prompt at the end — leaves the page
 * between them sharp, the way the header's own groups do.
 *
 * The blur is painted on the page's Blur plane, under every control, so it
 * never lands on the header's own groups and theirs never lands on this row.
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

interface StickyControlGroupProps {
  /** The controls in the group — a media type toggle, a sort picker, a reset. */
  children: ReactNode;
  /**
   * StyleX styles merged over the group's own — where the group sits in the
   * row, such as `marginInlineStart: auto` for one at the inline end.
   */
  css?: StyleProp;
}

/**
 * One group of a sticky row's controls, with the page blurred around it while
 * the row holds. The controls sit directly on the blur, in a row, with no
 * surface of their own.
 */
export function StickyControlGroup({ children, css }: StickyControlGroupProps) {
  const isStuck = use(StuckContext);

  return (
    <ControlGroupBlur isShown={isStuck} css={css}>
      {children}
    </ControlGroupBlur>
  );
}

const styles = stylex.create({
  // Parked under whatever strip of chrome the shell floats over the page, and
  // at the top of the scroller outside a shell, which publishes none. Above the
  // cards it pins over, including one lifted by hover, and below the header it
  // parks beneath.
  //
  // Groups sit as far apart as the controls inside one, so two left side by
  // side read as one cluster and the row is no wider than the controls alone.
  sticky: {
    position: "sticky",
    insetBlockStart: "var(--header-controls-clearance, 0px)",
    zIndex: layer.raised,
    display: "flex",
    gap: space._1,
  },
});
