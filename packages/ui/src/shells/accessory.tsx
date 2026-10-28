"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { displayMode } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { pageGutter } from "../primitives/page-column.stylex.ts";
import { islandTokens } from "../surfaces/island.stylex.ts";
import { layer, rhythm, space } from "../tokens.stylex.ts";
import { accessoryQueries, accessoryTokens } from "./accessory.stylex.ts";
import { tabViewTokens } from "./tab-view.stylex.ts";

export interface AccessoryProps {
  /**
   * The control, such as an Add action. Give it a look for each place with
   * `accessoryQueries`.
   *
   * @zh 控件，例如“添加”操作。可以用 `accessoryQueries` 为每个位置分别指定外观。
   */
  children: ReactNode;
}

/**
 * A control at the bottom end of a column of content, such as the Add action
 * of a screen. Put it last in a column that is a flex column and that sets
 * `accessoryTokens.contentPaddingBlockEnd` to the padding after its content.
 * The control floats over the content that scrolls under it, above the
 * floating tab bar of a `TabView`, and the column keeps room for it after its
 * content, so that the last row scrolls clear of it.
 *
 * In an app opened from the Home Screen, where the safe area at the inline
 * end of the screen is wide enough for a control, and the island of the
 * column reaches that edge, the control moves into that column, at the
 * bottom, level with the tab bar. The column then keeps no room for it. In a
 * browser tab the control floats, because the browser can draw its own
 * controls in that column. A media query and a container query choose, so
 * the server paints the right place. The island reaches the edge where
 * `islandTokens.insetInlineEnd` is `0px`, and its content then keeps one
 * `pageGutter` from the edge.
 */
export function Accessory({ children }: AccessoryProps) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[styles.accessory, css]}>
      <div css={styles.slot}>
        <span aria-hidden css={styles.rest} />
        <EffectCarrier value={sticky}>
          <div css={styles.control}>{children}</div>
        </EffectCarrier>
      </div>
    </div>
  );
}

/** Above the tab bar below `md`, and above the safe area from `md` up. */
const INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // The accessory sticks to the bottom of the scroller, or of the screen
  // where the page scrolls. At the end of the content, its place in the flow
  // is the room the column keeps for it, and the negative margin puts that
  // place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: INSET_BLOCK_END,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockStart: "auto",
    marginBlockEnd: `calc(${INSET_BLOCK_END} - ${accessoryTokens.contentPaddingBlockEnd})`,
    pointerEvents: "none",
  },
  // In an app from the Home Screen, as wide as the safe area that the island
  // takes in at the inline end, and 0 where the island stops at the safe
  // area. In a browser tab, 0: Safari puts its tab controls at the bottom of
  // the side column. The floating control is wider, and it overflows to the
  // start, so it ends where the content ends.
  slot: {
    containerName: "accessory",
    containerType: "inline-size",
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
    flexShrink: 0,
    inlineSize: {
      default: "0px",
      [displayMode.standalone]: `max(0px, env(safe-area-inset-right) - ${islandTokens.insetInlineEnd})`,
    },
  },
  // In the rail, the control leaves the flow, and this keeps the end of the
  // content where it is with no accessory.
  rest: {
    display: { default: "none", [accessoryQueries.rail]: "block" },
    blockSize: `max(0px, ${accessoryTokens.contentPaddingBlockEnd} - ${INSET_BLOCK_END})`,
  },
  control: {
    position: { default: null, [accessoryQueries.rail]: "absolute" },
    insetInlineEnd: {
      default: null,
      [accessoryQueries.rail]: `calc(-1 * ${pageGutter.inlineEnd})`,
    },
    insetBlockEnd: {
      default: null,
      [accessoryQueries.rail]: `calc(${tabViewTokens.barInsetBlockEnd} - ${INSET_BLOCK_END})`,
    },
    display: { default: null, [accessoryQueries.rail]: "flex" },
    justifyContent: { default: null, [accessoryQueries.rail]: "center" },
    flexShrink: 0,
    inlineSize: { default: null, [accessoryQueries.rail]: "100%" },
    paddingBlockStart: { default: rhythm.item, [accessoryQueries.rail]: 0 },
    pointerEvents: "auto",
  },
});
