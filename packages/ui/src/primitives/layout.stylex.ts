import * as stylex from "@stylexjs/stylex";
import { border, color } from "../tokens.stylex.ts";

// Position + inset fills
export const absoluteFill = stylex.create({
  all: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  x: { position: "absolute", left: 0, right: 0 },
  y: { position: "absolute", top: 0, bottom: 0 },
});

export const fixedFill = stylex.create({
  all: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
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
      ":focus-visible": `2px solid ${color.accent}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
    borderRadius: border.radius_2,
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
// `scrollbarThumb` token (a notch softer than `textSubtle`, ~3:1 either theme).
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
export const scrollbar = stylex.create({
  autoHide: {
    scrollbarWidth: {
      default: "auto",
      "@media (hover: hover) and (not (any-pointer: coarse))": "thin",
    },
    scrollbarColor: {
      default: "auto",
      "@media (hover: hover) and (not (any-pointer: coarse))": {
        default: "transparent transparent",
        ":hover": `${color.scrollbarThumb} transparent`,
        ":focus-within": `${color.scrollbarThumb} transparent`,
      },
    },
  },
});

// Text truncation — the 3-property recipe
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
