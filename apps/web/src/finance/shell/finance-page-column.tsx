"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import {
  pageColumnTokens,
  pageGutter,
} from "@tuja/ui/primitives/page-column.stylex";
import { layer, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { floatingActionTokens } from "./floating-action.stylex.ts";

interface FinancePageColumnProps {
  /**
   * A control that floats at the bottom end of the screen, such as the Add
   * action. The screen keeps room for it after its content.
   */
  accessory?: ReactNode;
  children: ReactNode;
}

/**
 * The layout of a Finance screen that the page scrolls, such as Analytics:
 * centred at the width of the page column, and clear of the status bar and
 * of the tab bar. A screen in columns is a `NavigationSplitView` instead.
 */
export function FinancePageColumn({
  accessory,
  children,
}: FinancePageColumnProps) {
  return (
    <div css={styles.page}>
      <div css={styles.column}>
        {children}
        {accessory == null ? null : <Accessory>{accessory}</Accessory>}
      </div>
    </div>
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

const PADDING_BLOCK_END = `calc(${space._8} + max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  page: {
    paddingBlockStart: `calc(${space._4} + env(safe-area-inset-top))`,
    paddingBlockEnd: PADDING_BLOCK_END,
    paddingInlineStart: {
      default: pageGutter.inlineStart,
      [breakpoints.md]: space._8,
    },
    paddingInlineEnd: {
      default: pageGutter.inlineEnd,
      [breakpoints.md]: `calc(${pageGutter.inlineEnd} + ${space._3})`,
    },
  },
  column: {
    maxInlineSize: pageColumnTokens.inlineSize,
    marginInline: "auto",
  },
  // The accessory sticks to the bottom of the screen. At the end of the
  // page, its place in the flow is the room the page keeps for it, and the
  // negative margin puts that place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: floatingActionTokens.insetBlockEnd,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockEnd: `calc(${floatingActionTokens.insetBlockEnd} - ${PADDING_BLOCK_END})`,
    paddingBlockStart: rhythm.item,
    pointerEvents: "none",
  },
  accessoryControl: {
    pointerEvents: "auto",
  },
});
