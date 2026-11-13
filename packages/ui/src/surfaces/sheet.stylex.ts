import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import {
  controlSize,
  layer,
  rhythm,
  safeArea,
  space,
} from "../tokens.stylex.ts";

const EDGE_GAP = space._2;
const BOTTOM_GAP = `max(${EDGE_GAP}, env(safe-area-inset-bottom))`;
const TOP_GAP = `calc(${space._7} + ${safeArea.blockStart})`;
const CLOSE_INSET = space._2;
const CONTENT_INSET = space._3;
// The close button is an md Button, so it is as tall as the md step.
const CLOSE_SIZE = controlSize._9;
const BOUNDARY = "sheet-boundary";
const WIDE_BOUNDARY = `@container ${BOUNDARY} (width >= 768px)`;

/**
 * The boxes of a `Sheet`: the dim, the anchor, the mover, the card and its
 * chrome, each with its form inside a `SheetBoundary`.
 *
 * @internal
 */
export const styles = stylex.create({
  boundary: {
    position: "relative",
    containerName: BOUNDARY,
    containerType: "inline-size",
  },
  dimContained: {
    insetBlockEnd: 0,
    blockSize: "100%",
  },
  anchorContained: {
    position: "absolute",
    inset: 0,
    overflowX: "clip",
    zIndex: layer.overlay,
    pointerEvents: "none",
  },
  // The mover is a flex column with a height cap, so the card shrinks to
  // the boundary and its scroller scrolls.
  moverContained: {
    position: "absolute",
    display: "flex",
    flexDirection: "column",
    insetBlockStart: { default: "auto", [WIDE_BOUNDARY]: "50%" },
    insetBlockEnd: { default: EDGE_GAP, [WIDE_BOUNDARY]: "auto" },
    insetInlineStart: { default: EDGE_GAP, [WIDE_BOUNDARY]: "50%" },
    translate: { default: "none", [WIDE_BOUNDARY]: "-50% -50%" },
    inlineSize: {
      default: `calc(100% - 2 * ${EDGE_GAP})`,
      [WIDE_BOUNDARY]: `min(100% - 2 * ${space._7}, ${space._16})`,
    },
    maxBlockSize: {
      default: `calc(100% - ${space._7} - ${EDGE_GAP})`,
      [WIDE_BOUNDARY]: `calc(100% - 2 * ${space._8})`,
    },
    transformOrigin: "50% 100%",
  },
  cardContained: {
    minBlockSize: 0,
  },
  // A box that the layout goes through as if it is not there.
  clip: {
    display: "flex",
    flexDirection: "column",
    minBlockSize: 0,
  },
  // A box with no height in the document. Below `md` it is at the bottom of
  // the visible area, so it is on the keyboard while one is open. From `md`
  // up it is a point at the centre of the visible area.
  anchor: {
    position: "absolute",
    // Physical, so the centre is the same in either direction.
    left: { default: 0, [breakpoints.md]: "50%" },
    // As wide as the screen, so that a lift can clip the card sideways to
    // the screen.
    inlineSize: { default: "100vw", [breakpoints.md]: 0 },
    blockSize: 0,
    zIndex: layer.overlay,
    // Nothing in the anchor takes a click except the card itself.
    pointerEvents: "none",
  },
  anchorAt: (visibleBottom: string, visibleHeight: string) => ({
    insetBlockStart: {
      default: visibleBottom,
      [breakpoints.md]: `calc(${visibleBottom} - ${visibleHeight} / 2)`,
    },
  }),
  // Over the whole body and one screen below it, and one step under the
  // overlay plane, so the card, which is on that plane, stays over it. The
  // screen below the body gives Safari on iOS page to dim under its toolbar
  // at the end of the document, and where it scrolls past that end for the
  // keyboard. The card that moves below the screen stays in that screen, so
  // it does not make the document taller.
  dim: {
    position: "absolute",
    insetBlockStart: 0,
    // The body can be a fraction of a pixel shorter than the document. The
    // 1px makes sure that the dim goes a full screen past the end of the
    // document.
    insetBlockEnd: "calc(-100lvh - 1px)",
    insetInlineStart: 0,
    inlineSize: "100%",
    backgroundColor: color.overlay,
    zIndex: `calc(${layer.overlay} - 1)`,
  },
  // A tap on the page while the card leaves goes to the page.
  dimLeaving: {
    pointerEvents: "none",
  },
  // The mover takes its width from the viewport, not from the anchor.
  // The card fills it.
  mover: {
    position: "absolute",
    insetBlockStart: { default: "auto", [breakpoints.md]: 0 },
    insetBlockEnd: { default: BOTTOM_GAP, [breakpoints.md]: "auto" },
    left: {
      default: `calc(${EDGE_GAP} + env(safe-area-inset-left))`,
      [breakpoints.md]: 0,
    },
    translate: { default: "none", [breakpoints.md]: "-50% -50%" },
    inlineSize: {
      default: `calc(100vw - 2 * ${EDGE_GAP} - env(safe-area-inset-left) - env(safe-area-inset-right))`,
      [breakpoints.md]: `min(100vw - 2 * ${space._7}, ${space._16})`,
    },
    transformOrigin: "50% 100%",
  },
  card: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    inlineSize: "100%",
    overflow: "hidden",
    backgroundColor: color.card,
    pointerEvents: "auto",
  },
  cardFit: (visibleHeight: string) => ({
    maxBlockSize: {
      default: `calc(${visibleHeight} - ${TOP_GAP} - ${BOTTOM_GAP})`,
      [breakpoints.md]: `calc(${visibleHeight} - 2 * ${space._8})`,
    },
  }),
  grabber: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    display: { default: "flex", [breakpoints.md]: "none" },
    justifyContent: "center",
    paddingBlockStart: space._1,
    inlineSize: space._10,
    blockSize: space._5,
    marginInline: "auto",
    // The grabber moves the card for every pointer, so the browser must not
    // take its touches for a scroll or a zoom.
    touchAction: "none",
    userSelect: "none",
    // Over the canvases of the Scroll region.
    zIndex: layer.raised,
  },
  grabberBar: {
    inlineSize: space._7,
    blockSize: space._0,
    backgroundColor: color.input,
  },
  scroller: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    touchAction: "pan-x pan-y",
    // The top clears the close button in the card's corner. A sticky box in
    // the content stops at this padding, so it stays on the scroller.
    paddingBlockStart: space._8,
    paddingBlockEnd: space._7,
  },
  // The content box of the Scroll region. The effect layer puts the canvases
  // of the region at its end, so they cover the inline padding too.
  content: {
    position: "relative",
    paddingInline: CONTENT_INSET,
  },
  // The title takes the close button's row, so the content starts level
  // with the button.
  scrollerTitled: {
    paddingBlockStart: CLOSE_INSET,
  },
  // As tall as the close button and centred on it. The inline end keeps
  // clear of the button.
  title: {
    display: "flex",
    alignItems: "center",
    minBlockSize: CLOSE_SIZE,
    paddingInlineEnd: `calc(${CLOSE_INSET} + ${CLOSE_SIZE} + ${rhythm.tight} - ${CONTENT_INSET})`,
    marginBlockEnd: rhythm.tight,
  },
  closeCorner: {
    position: "absolute",
    insetInlineEnd: CLOSE_INSET,
    insetBlockStart: CLOSE_INSET,
    // Above the consumer's content and the canvases of the Scroll region,
    // since the close affordance is the sheet's own chrome, not the
    // consumer's.
    zIndex: layer.raised,
  },
});
