import * as stylex from "@stylexjs/stylex";
import { viewWidth } from "./view-width.stylex.ts";

/**
 * Shows an element only at one side of the width where a `TabView` swaps its
 * tab bar for the rail, 768px (`breakpoints.md`). It is the design system's
 * `hidden md:block` and `md:hidden`: give the two forms of one content, such
 * as a `Table` on a wide screen and a `ListRow` list on a phone, each to its
 * own wrapper.
 *
 * ```tsx
 * <div css={show.fromMd}><Table … /></div>
 * <div css={show.belowMd}><List … /></div>
 * ```
 *
 * It measures the `TabView` around it, not the screen, as the view does, so
 * the content takes the same form as the view in a frame such as a demo.
 * Outside a `TabView` there is no rail, and `fromMd` always shows while
 * `belowMd` never does: the wide form stays, and it scrolls.
 *
 * Each member owns the element's `display`. Give it to a wrapper, not to an
 * element whose `display` is part of its layout, such as a flex row.
 */
export const show = stylex.create({
  /** Shows the element where the view is 768px wide or wider. */
  fromMd: {
    display: { default: null, [viewWidth.belowMd]: "none" },
  },
  /**
   * Shows the element where the view is narrower than 768px, where the tab
   * bar shows. There it takes the `display` its element has by default.
   */
  belowMd: {
    display: { default: "none", [viewWidth.belowMd]: "revert" },
  },
});
