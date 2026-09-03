"use client";

import { createContext, use, type ReactNode } from "react";
import type { StyleProp } from "../style-prop.ts";
import { ControlGroupBlur } from "./control-group-blur.tsx";

// Whether the row is holding at its offset; every group reads it so they
// blur and melt together.
/** @internal */
export const StuckContext = createContext(false);

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
 * One group of a sticky row's controls, with the page blurred around it
 * while the row holds. The controls sit directly on the blur, in a row, with
 * no surface of their own.
 */
export function StickyControlGroup({ children, css }: StickyControlGroupProps) {
  const isStuck = use(StuckContext);

  return (
    <ControlGroupBlur isShown={isStuck} css={css}>
      {children}
    </ControlGroupBlur>
  );
}
