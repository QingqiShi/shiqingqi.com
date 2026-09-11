"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { useStuck } from "../../hooks/use-stuck.ts";
import { layer, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { StuckContext } from "./sticky-control-group.tsx";

export { StickyControlGroup } from "./sticky-control-group.tsx";

interface StickyControlsProps {
  /**
   * The row's groups — a `StickyControlGroup` per cluster of controls. Two
   * clusters far enough apart show as two blurs with sharp page between
   * them; anything outside a group is laid out in the row but never
   * blurred.
   *
   * @zh 行内的控件组——每一簇控件对应一个 StickyControlGroup。相距足够远的两簇各显示为一片虚化，中间的页面保持清晰；不在任何组内的内容会排在行中，但不会被虚化。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the sticky row's own — the escape hatch for
   * where the row sits and where it parks: its measure, padding, margins,
   * the breakpoint it shows at, and `insetBlockStart` for a row that parks
   * somewhere other than under the header strip. The row is a flex row with
   * a gap between its groups, so a display override at a breakpoint has to
   * say `flex`, not `block`.
   *
   * @zh 与粘性行自身样式合并的 StyleX 样式——用于控制这一行的位置与停放点：版心、内边距、外边距、显示所在的断点，以及停放点不在页头下方时的 insetBlockStart。这一行是各组之间带间距的弹性行；按断点覆盖 display 时应写 flex，而不是 block。
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
