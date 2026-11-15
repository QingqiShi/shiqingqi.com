import * as stylex from "@stylexjs/stylex";
import { StickyControlGroup } from "@tuja/ui/components/sticky-controls";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

interface FloatingActionsProps {
  /**
   * The actions, each a Button. Put the main action last, so that it sits at
   * the inline end, where the Add button floats.
   */
  children: ReactNode;
  /** Places the group in its row. */
  css?: StyleProp;
}

/**
 * Form actions that float over the content scrolling behind them at the
 * inline end, instead of a bar across the bottom of the screen. Put the group
 * in a `StickyControls` row: while the row holds, the content behind the
 * actions is blurred.
 */
export function FloatingActions({ children, css }: FloatingActionsProps) {
  return (
    <StickyControlGroup css={[styles.group, css]}>
      {children}
    </StickyControlGroup>
  );
}

const styles = stylex.create({
  // The group is only as wide as its actions, so that the empty part of the
  // row does not cover the content behind it.
  group: {
    inlineSize: "fit-content",
    marginInlineStart: "auto",
  },
});
