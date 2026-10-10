import * as stylex from "@stylexjs/stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

interface FloatingActionsProps {
  /**
   * The actions, each a Button or an AnchorButton that takes
   * `floatingAction.lift`. Put the main action last, so that it sits at the
   * inline end, where the Add button floats.
   */
  children: ReactNode;
  /** Places the group, such as a sticky offset. */
  css?: StyleProp;
}

/**
 * Form actions that float over the content scrolling behind them at the
 * inline end, instead of a bar across the bottom of the screen.
 */
export function FloatingActions({ children, css }: FloatingActionsProps) {
  return <div css={[row.tight, styles.group, css]}>{children}</div>;
}

const styles = stylex.create({
  // The group is only as wide as its actions, so that the empty part of the
  // row does not cover the content behind it.
  group: {
    inlineSize: "fit-content",
    marginInlineStart: "auto",
  },
});
