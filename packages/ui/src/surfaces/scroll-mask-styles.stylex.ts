import * as stylex from "@stylexjs/stylex";
import { layer } from "../tokens.stylex.ts";
import { scrollMaskTokens } from "./scroll-mask.stylex.ts";

/**
 * The boxes of a `ScrollMask`: the root, the scroller, the chrome slots and the
 * bands.
 *
 * @internal
 */
export const styles = stylex.create({
  // `grid` hands the scroller the root's whole box on both axes, so a region
  // sized from outside or by its own content both work.
  root: {
    position: "relative",
    display: "grid",
  },
  // Root and scroller both zero their minimum size on the scroll axis, so the
  // region shrinks in a flex/grid parent instead of pushing it open.
  rootVertical: {
    minBlockSize: 0,
  },
  rootHorizontal: {
    minInlineSize: 0,
  },
  scrollerVertical: {
    overflowX: "hidden",
    overflowY: "auto",
    minBlockSize: 0,
  },
  scrollerHorizontal: {
    overflowX: "auto",
    overflowY: "hidden",
    minInlineSize: 0,
  },
  snapSuspended: {
    scrollSnapType: "none",
  },
  // The scroller clips to the root's corners, so content clips like the
  // region while the sibling bands do not.
  scrollerCorners: {
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // With chrome, the scroller becomes a flex line — slot, middle, slot —
  // where the middle grows, so end chrome stays pinned even when content is
  // short.
  scrollerChromeColumn: {
    display: "flex",
    flexDirection: "column",
  },
  scrollerChromeRow: {
    display: "flex",
    flexDirection: "row",
  },
  // `flexShrink: 0` keeps the middle at its content size, so a region taller
  // than its box overflows and scrolls instead of crushing the children.
  middle: {
    flexGrow: 1,
    flexShrink: 0,
  },
  // The effect layer puts the Scroll region's <canvas> elements at the end of
  // this box, so they cover it and scroll with it.
  content: {
    position: "relative",
  },
  // The one child of the scroller lays out the children as the scroller
  // would, from the layout that `contentCss` gives the scroller, and fills
  // the scroller's content box on each axis.
  contentTakesLayout: {
    display: "inherit",
    flexDirection: "inherit",
    flexWrap: "inherit",
    alignItems: "inherit",
    alignContent: "inherit",
    justifyContent: "inherit",
    justifyItems: "inherit",
    rowGap: "inherit",
    columnGap: "inherit",
    gridTemplateColumns: "inherit",
    gridTemplateRows: "inherit",
    gridTemplateAreas: "inherit",
    gridAutoFlow: "inherit",
    gridAutoColumns: "inherit",
    gridAutoRows: "inherit",
    flexGrow: 1,
    flexShrink: 0,
    alignSelf: "stretch",
    justifySelf: "stretch",
    gridColumn: "1 / -1",
    minInlineSize: 0,
  },
  // z-index:1 clears the middle's own positioned descendants and this edge's
  // band. `backdrop-filter` only blurs what painted before it, so keeping this
  // chrome above keeps it crisp.
  chrome: {
    position: "sticky",
    zIndex: 1,
    flexShrink: 0,
  },
  // The plane of stuck chrome in a Scroll region, over the region's <canvas>
  // elements on `layer.effect`. The css of `useEffectSticky` comes after it.
  chromeOverEffects: {
    zIndex: layer.raised,
  },
  chromeBlockStart: {
    insetBlockStart: 0,
  },
  chromeBlockEnd: {
    insetBlockEnd: 0,
  },
  chromeInlineStart: {
    insetInlineStart: 0,
  },
  chromeInlineEnd: {
    insetInlineEnd: 0,
  },
  bandBlockStart: {
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
  },
  bandBlockEnd: {
    insetBlockEnd: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
  },
  bandInlineStart: {
    insetInlineStart: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
  },
  bandInlineEnd: {
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
  },
});

/**
 * The styles of a `ScrollMask` that take a measured or a caller's size.
 *
 * @internal
 */
export const dynamicStyles = stylex.create({
  blockSize: (size: string) => ({ blockSize: size }),
  inlineSize: (size: string) => ({ inlineSize: size }),
  scrollPaddingBlock: (start: number, end: number) => ({
    scrollPaddingBlockStart: `${String(start)}px`,
    scrollPaddingBlockEnd: `${String(end)}px`,
  }),
  endChromeSize: (end: number) => ({
    [scrollMaskTokens.endChrome]: `${String(end)}px`,
  }),
  scrollbarSize: (size: number) => ({
    [scrollMaskTokens.scrollbar]: `${String(size)}px`,
  }),
  scrollPaddingInline: (start: number, end: number) => ({
    scrollPaddingInlineStart: `${String(start)}px`,
    scrollPaddingInlineEnd: `${String(end)}px`,
  }),
  // Padding grows the scrollport past the root on this axis. The matching
  // negative margin gives that room back, so the content's place and the
  // region's size don't shift.
  clipMarginBlock: (size: string) => ({
    paddingBlockStart: size,
    paddingBlockEnd: size,
    marginBlockStart: `calc(-1 * ${size})`,
    marginBlockEnd: `calc(-1 * ${size})`,
  }),
  clipMarginInline: (size: string) => ({
    paddingInlineStart: size,
    paddingInlineEnd: size,
    marginInlineStart: `calc(-1 * ${size})`,
    marginInlineEnd: `calc(-1 * ${size})`,
  }),
  bandClipBlock: (size: string) => ({
    insetBlockStart: `calc(-1 * ${size})`,
    insetBlockEnd: `calc(-1 * ${size})`,
  }),
  bandClipInline: (size: string) => ({
    insetInlineStart: `calc(-1 * ${size})`,
    insetInlineEnd: `calc(-1 * ${size})`,
  }),
});
