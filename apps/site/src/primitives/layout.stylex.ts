import * as stylex from "@stylexjs/stylex";
import { border, color } from "#src/tokens.stylex.ts";

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
      ":focus-visible": `2px solid ${color.controlActive}`,
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
