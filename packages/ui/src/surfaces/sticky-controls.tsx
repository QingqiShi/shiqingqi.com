"use client";

import * as stylex from "@stylexjs/stylex";
import { use, type ReactNode } from "react";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { headerControlsTokens } from "../shells/header-controls.stylex.ts";
import { layer, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  BlurPlane,
  BlurPlaneContext,
  BlurPlaneProvider,
} from "./blur-plane.tsx";
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
  const sticky = useEffectSticky();
  const { ref, isStuck, css: stickyCss } = sticky;
  const hasPlaneAround = use(BlurPlaneContext) !== null;
  const groups = <EffectCarrier value={sticky}>{children}</EffectCarrier>;

  return (
    <StuckContext value={isStuck}>
      <div ref={ref} css={[styles.sticky, css, stickyCss]}>
        {hasPlaneAround ? (
          groups
        ) : (
          <BlurPlaneProvider>
            <BlurPlane css={styles.blurPlane} />
            {groups}
          </BlurPlaneProvider>
        )}
      </div>
    </StuckContext>
  );
}

const styles = stylex.create({
  // Stuck at `raised`, above the cards it pins over (including one lifted by
  // hover), and below the header it parks beneath. The small gap keeps two
  // groups reading as one cluster rather than spanning the row.
  sticky: {
    position: "sticky",
    insetBlockStart: headerControlsTokens.clearance,
    zIndex: layer.raised,
    display: "flex",
    gap: rhythm.item,
  },
  // Where no shell or sheet around the row keeps a Blur plane, the row keeps
  // one, under all its groups. Without a plane, each blur is beside its group:
  // the blur of one group covers the controls of the group before it, and
  // each group becomes the containing block of what it holds.
  blurPlane: {
    zIndex: -1,
  },
});
