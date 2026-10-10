import * as stylex from "@stylexjs/stylex";
import { pageGutter } from "@tuja/ui/primitives/page-column.stylex";

/**
 * A box that steps out by one page gutter on each side and pads its content
 * back in by the same amount. In a parent padded by one gutter, such as the
 * wide page column, its background and anything that spans it reach the
 * screen edges.
 */
export const gutterBleed = stylex.create({
  base: {
    marginInlineStart: `calc(-1 * ${pageGutter.inlineStart})`,
    marginInlineEnd: `calc(-1 * ${pageGutter.inlineEnd})`,
    paddingInlineStart: pageGutter.inlineStart,
    paddingInlineEnd: pageGutter.inlineEnd,
  },
});
