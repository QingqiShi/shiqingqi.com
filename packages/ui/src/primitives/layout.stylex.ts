import * as stylex from "@stylexjs/stylex";
import { border, color } from "../tokens.stylex.ts";

// Position + inset fills
export const absoluteFill = stylex.create({
  all: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  x: { position: "absolute", left: 0, right: 0 },
  y: { position: "absolute", top: 0, bottom: 0 },
});

// Viewport-anchored overlay layers. Safari on iOS hit-tests the fixed or
// sticky box under the top-centre of the viewport. A fixed box that holds
// anything and is at least nine tenths of the viewport wide or tall makes
// Safari paint a flat colour into the status bar, and keep it while that box
// stays in the document. A box under nine tenths in both dimensions is walked
// past. So an overlay anchors to a 0 x 0 box, and each layer inside it states
// its own viewport size. See "Progressive blur" in CONTEXT.md.
export const viewportAnchor = stylex.create({
  /**
   * A fixed 0 x 0 box at the viewport origin: a containing block for overlays
   * that bring their own size.
   */
  fixed: {
    position: "fixed",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: 0,
    blockSize: 0,
  },
});

export const viewportFill = stylex.create({
  /**
   * An absolute box the size of the viewport, for use inside the anchor. The
   * `auto` end insets let it compose over a base style that sets `inset: 0`.
   */
  absolute: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: "auto",
    insetBlockEnd: "auto",
    inlineSize: "100vw",
    blockSize: "100dvh",
  },
});

// Size fills — a box that takes the width it is given. Distinct from
// `absoluteFill`/`viewportFill` above, which take their parent out of flow and
// pin it by inset; this one stays in flow and only sets a size. Inline axis
// only, because that is the one that keeps being asked for: a block-level
// element inside a flex or grid parent shrinks to its content, and a specimen,
// a field or a card usually wants the whole track. Add a block member when a
// second caller needs one.
export const fill = stylex.create({
  inline: { inlineSize: "100%" },
});

// Scroll containers — overflow + scrollbar behavior
export const scrollX = stylex.create({
  base: {
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    scrollbarWidth: "none",
  },
  /** Visible focus ring for keyboard-navigable scroll containers (tabIndex={0}). */
  focusRing: {
    outline: {
      default: "none",
      ":focus-visible": `${border.size_2} solid ${color.accent}`,
    },
    outlineOffset: { default: null, ":focus-visible": border.size_2 },
    borderRadius: border.radius_2,
    cornerShape: "squircle",
  },
});

export const scrollY = stylex.create({
  base: {
    overflowY: "auto",
  },
});

// Auto-hiding themed scrollbar — compose onto any non-root scroll container
// (never `html`/`body`; the platform owns the root scrollbar). Uses only the
// standardized `scrollbar-*` properties, so it themes Chromium, Firefox and
// modern Safari WITHOUT `::-webkit-scrollbar` — which, once given a size, forces
// the macOS/iOS overlay scrollbar to become an always-present classic one.
//
// The whole auto-hide (thin width + transparent-at-rest colour + reveal) is
// gated behind `(hover: hover) and (not (any-pointer: coarse))` — a precise
// pointer with NO touch pointer available. Every touch-capable device (phone,
// tablet, and hover-capable hybrids like a Surface) is excluded and keeps a
// fully native scrollbar: touch scrolling fires no hover to trigger the reveal,
// and a transparent thumb would hide even the platform's while-scrolling
// indicator. On a pure-pointer device the thumb is transparent at rest and
// reveals on pointer hover or keyboard `:focus-within`, using the low-contrast
// `scrollbarThumb` token (softer than `textSubtle`, ~3:1 either theme).
//
// `:focus-within`, not `:has(:focus-visible)`: `:has()` only shipped in Firefox
// 121, below this package's Firefox 120 floor (see README). The cost is that
// clicking a nav link (which focuses it) keeps the bar shown while that link
// holds focus — accepted, since it tracks focus and clears on the next
// interaction, and dropping the focus reveal would strand keyboard users on
// classic-scrollbar platforms with no scroll indicator at all.
//
// Note: hiding at rest overrides a classic/"always show scrollbars" preference
// on pointer devices — an accepted trade for the always-clean look.
//
// The fade is NOT here: compose `transition.scrollbarColor` (motion.stylex.ts)
// alongside this. Keeping the `transition` shorthand out of the primitive avoids
// clobbering a consumer's own transition (StyleX composition is last-wins per
// property) and colocates the timing with the motion scale.
// A precise pointer with NO touch pointer available — the predicate the whole
// auto-hide is gated behind, named once so the declarations that use it cannot
// drift apart (mirroring `REDUCED_MOTION` in motion.stylex.ts).
const NON_TOUCH_DEVICE =
  "@media (hover: hover) and (not (any-pointer: coarse))";

// `defineConsts`, not a plain object: `design-system/only-stylex-exports` gives
// the reason. Exported because a component that shows a pointer-only
// affordance needs the same predicate — `ScrollMask`'s scroll buttons, which
// a touch device replaces with a swipe.
export const pointerConstants = stylex.defineConsts({
  NON_TOUCH_DEVICE,
});

export const scrollbar = stylex.create({
  autoHide: {
    scrollbarWidth: {
      default: "auto",
      [NON_TOUCH_DEVICE]: "thin",
    },
    scrollbarColor: {
      default: "auto",
      [NON_TOUCH_DEVICE]: {
        default: "transparent transparent",
        ":hover": `${color.scrollbarThumb} transparent`,
        ":focus-within": `${color.scrollbarThumb} transparent`,
      },
    },
  },
});

// Text truncation — the 3-property primitive
export const truncate = stylex.create({
  base: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

// Image sizing — objectFit + dimensions
export const imageCover = stylex.create({
  base: {
    objectFit: "cover",
    width: "100%",
    height: "100%",
  },
});

export const imageContain = stylex.create({
  base: {
    objectFit: "contain",
    width: "100%",
    height: "100%",
  },
});
