"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { islandSurface, islandTokens } from "@tuja/ui/components/island.stylex";
import {
  tabViewQueries,
  tabViewTokens,
} from "@tuja/ui/components/tab-view.stylex";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  pageColumnTokens,
  pageGutter,
} from "@tuja/ui/primitives/page-column.stylex";
import { layer, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { floatingActionTokens } from "./floating-action.stylex.ts";

/**
 * The frame of a Finance screen that is not in the columns of a
 * `NavigationSplitView`: as tall as the screen, with one `FinanceIsland` for
 * each pane. Where the tab bar shows, the islands fill the screen, so show
 * one at a time there.
 */
export function FinanceIslands({ children }: { children: ReactNode }) {
  return <div css={[islandSurface.frame, styles.frame]}>{children}</div>;
}

interface FinanceIslandProps {
  /**
   * A control that floats at the bottom end of the island, such as the Add
   * action. The island keeps room for it after its content.
   */
  accessory?: ReactNode;
  /** StyleX styles merged over the island, such as its width. */
  css?: StyleProp;
  children: ReactNode;
}

/**
 * One pane of `FinanceIslands`, with its content centred at the width of the
 * page column. It scrolls on its own.
 */
export function FinanceIsland({
  accessory,
  css,
  children,
}: FinanceIslandProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div css={[islandSurface.base, styles.island, css]}>
      <div ref={scroller} css={[styles.scroller, a11y.focusRingInset]}>
        <div ref={content} css={styles.content}>
          <EffectCarrier value={region}>
            <div css={styles.column}>{children}</div>
            {accessory == null ? null : <Accessory>{accessory}</Accessory>}
          </EffectCarrier>
        </div>
      </div>
    </div>
  );
}

interface FinancePageColumnProps {
  /**
   * A control that floats at the bottom end of the screen, such as the Add
   * action. The screen keeps room for it after its content.
   */
  accessory?: ReactNode;
  children: ReactNode;
}

/** The layout of a Finance screen of one pane, such as Analytics: one island. */
export function FinancePageColumn({
  accessory,
  children,
}: FinancePageColumnProps) {
  return (
    <FinanceIslands>
      <FinanceIsland accessory={accessory}>{children}</FinanceIsland>
    </FinanceIslands>
  );
}

function Accessory({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[styles.accessory, css]}>
      <EffectCarrier value={sticky}>
        <div css={styles.accessoryControl}>{children}</div>
      </EffectCarrier>
    </div>
  );
}

/** The status bar, where the island goes under it. */
const STATUS_BAR = `max(0px, env(safe-area-inset-top) - ${islandTokens.insetBlockStart})`;
/** The tab bar or the safe area, where the island goes under it. */
const BOTTOM_BAR = `max(0px, max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)) - ${islandTokens.insetBlockEnd})`;
const PADDING_BLOCK_END = `calc(${space._8} + ${BOTTOM_BAR})`;

const styles = stylex.create({
  // Where the tab bar shows, the islands fill the screen, with no gaps and
  // no corners.
  frame: {
    [islandTokens.radius]: { default: null, [tabViewQueries.bar]: "0px" },
    [islandTokens.insetBlockStart]: {
      default: null,
      [tabViewQueries.bar]: "0px",
    },
    [islandTokens.insetBlockEnd]: {
      default: null,
      [tabViewQueries.bar]: "0px",
    },
    [islandTokens.insetInlineStart]: {
      default: null,
      [tabViewQueries.bar]: "0px",
    },
    [islandTokens.insetInlineEnd]: {
      default: null,
      [tabViewQueries.bar]: "0px",
    },
    blockSize: "100dvh",
    maxBlockSize: "100%",
  },
  island: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: "100%",
    paddingBlockStart: `calc(${space._4} + ${STATUS_BAR})`,
    paddingBlockEnd: PADDING_BLOCK_END,
    paddingInlineStart: {
      default: space._5,
      [tabViewQueries.bar]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: space._5,
      [tabViewQueries.bar]: pageGutter.inlineEnd,
    },
  },
  column: {
    inlineSize: "100%",
    maxInlineSize: pageColumnTokens.inlineSize,
    marginInline: "auto",
  },
  // The accessory sticks to the bottom of the island. At the end of the
  // content, its place in the flow is the room the island keeps for it, and
  // the negative margin puts that place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: floatingActionTokens.insetBlockEnd,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockStart: "auto",
    marginBlockEnd: `calc(${floatingActionTokens.insetBlockEnd} - ${PADDING_BLOCK_END})`,
    paddingBlockStart: rhythm.item,
    pointerEvents: "none",
  },
  accessoryControl: {
    pointerEvents: "auto",
  },
});
