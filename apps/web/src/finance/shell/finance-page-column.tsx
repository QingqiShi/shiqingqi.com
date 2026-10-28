"use client";

import * as stylex from "@stylexjs/stylex";
import { Accessory } from "@tuja/ui/components/accessory";
import { accessoryTokens } from "@tuja/ui/components/accessory.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { islandSurface, islandTokens } from "@tuja/ui/components/island.stylex";
import {
  tabViewQueries,
  tabViewTokens,
} from "@tuja/ui/components/tab-view.stylex";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  pageColumnTokens,
  pageGutter,
} from "@tuja/ui/primitives/page-column.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";

/**
 * The frame of a Finance screen that is not in the columns of a
 * `NavigationSplitView`: as tall as the screen, with one `FinanceIsland` for
 * each pane. Where the tab bar shows, the islands fill the screen, so show
 * one at a time there. There, the page scrolls the island, so that its
 * content goes under the status bar of the browser.
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
 * page column. It scrolls on its own, except where the tab bar shows.
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

/** The status bar, where the island goes under it. */
const STATUS_BAR = `max(0px, env(safe-area-inset-top) - ${islandTokens.insetBlockStart})`;
/** The tab bar or the safe area, where the island goes under it. */
const BOTTOM_BAR = `max(0px, max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)) - ${islandTokens.insetBlockEnd})`;
const PADDING_BLOCK_END = `calc(${space._8} + ${BOTTOM_BAR})`;

const styles = stylex.create({
  // Where the tab bar shows, the islands fill the screen, with no gaps and
  // no corners, and the page scrolls.
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
    blockSize: { default: "100dvh", [tabViewQueries.bar]: "auto" },
    maxBlockSize: { default: "100%", [tabViewQueries.bar]: "none" },
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
    overflowY: { default: "auto", [tabViewQueries.bar]: "visible" },
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: { default: "100%", [tabViewQueries.bar]: "100dvh" },
    paddingBlockStart: `calc(${space._4} + ${STATUS_BAR})`,
    paddingBlockEnd: PADDING_BLOCK_END,
    [accessoryTokens.contentPaddingBlockEnd]: PADDING_BLOCK_END,
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
});
