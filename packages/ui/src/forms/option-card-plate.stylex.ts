import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { border } from "../tokens.stylex.ts";

/** @internal */
export const plateGroupStyles = stylex.create({
  group: {
    position: "relative",
  },
});

/**
 * The selected fill as one plate behind the facade of cards. Each card is a
 * window: its layer clips its own copy of the plate, between the card's fill
 * and its content. The card's border is the window's frame.
 *
 * @internal
 */
export const plateStyles = stylex.create({
  // The card paints the facade only. The plate paints the selected look.
  facade: {
    isolation: "isolate",
    backgroundColor: {
      default: color.card,
      ":disabled": color.muted,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled)": color.accent,
        ":active:not(:disabled)": color.accent,
      },
      ":active:not(:disabled)": color.accent,
    },
  },
  frame: {
    borderColor: color.border,
  },
  frameArrived: {
    borderColor: color.foreground,
  },
  layer: {
    position: "absolute",
    inset: `calc(-1 * ${border.size_1})`,
    zIndex: -1,
    overflow: "clip",
    borderRadius: "inherit",
    cornerShape: "inherit",
    pointerEvents: "none",
  },
  piece: {
    position: "absolute",
    boxSizing: "border-box",
    backgroundColor: color.accent,
  },
  // A corner holds the whole arc and one more pixel, so that it overlaps the
  // bands and no seam shows between them.
  corner: {
    inlineSize: `calc(${border.radius_3} + ${border.size_1})`,
    blockSize: `calc(${border.radius_3} + ${border.size_1})`,
    // The plate carries the fill only. Its edge stays clear, so that the
    // frame of the card shows where the plate lies under the border.
    borderStyle: "solid",
    borderWidth: 0,
    borderColor: "transparent",
    backgroundClip: "padding-box",
  },
  across: {
    insetBlock: border.radius_3,
    insetInline: border.size_1,
  },
  down: {
    insetBlock: border.size_1,
    insetInline: border.radius_3,
  },
});

/** @internal */
export const cornerStyles = stylex.create({
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: border.size_1,
    borderLeftWidth: border.size_1,
    borderTopLeftRadius: border.radius_3,
    cornerShape: "squircle",
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: border.size_1,
    borderRightWidth: border.size_1,
    borderTopRightRadius: border.radius_3,
    cornerShape: "squircle",
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: border.size_1,
    borderLeftWidth: border.size_1,
    borderBottomLeftRadius: border.radius_3,
    cornerShape: "squircle",
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: border.size_1,
    borderRightWidth: border.size_1,
    borderBottomRightRadius: border.radius_3,
    cornerShape: "squircle",
  },
});
