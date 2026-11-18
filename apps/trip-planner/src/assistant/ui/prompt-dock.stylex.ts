import * as stylex from "@stylexjs/stylex";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";

// The place of the accessory of a column of a `NavigationSplitView`: above
// the tab bar below 34rem, and above the safe area from 34rem up.
const DOCK_INSET = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

/** The prompt to the assistant, docked at the bottom of the page in a `StickyControls`. */
export const promptDock = stylex.create({
  // Safari on iOS takes the colour of its toolbar from a sticky box at the
  // bottom edge of the screen that is as wide as the screen. The dock stops
  // clear of that edge, and it is narrower than nine tenths of the screen.
  dock: {
    insetBlockStart: "auto",
    insetBlockEnd: DOCK_INSET,
    inlineSize: "100%",
    marginInline: "auto",
    maxInlineSize: "89vw",
    marginBlockStart: rhythm.group,
  },
  /** Toasts above a dock of this height. */
  toastsAbove: (dockHeight: number) => ({
    [toastTokens.clearance]: `calc(${DOCK_INSET} + ${String(dockHeight)}px)`,
  }),
});
