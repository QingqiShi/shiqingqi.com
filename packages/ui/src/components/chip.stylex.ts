import * as stylex from "@stylexjs/stylex";
import {
  border,
  color,
  controlSize,
  font,
  opacity,
  space,
} from "../tokens.stylex.ts";

/**
 * The pill skin shared by every chip in the system, exposed as composable
 * StyleX so a consumer can drop the exact same chip onto an element the `Chip`
 * component can't be — most often a Next.js `<Link>`. This is the custom-layer
 * escape hatch behind `Chip` (which composes these same styles), mirroring how
 * `cardSurface` backs `Card`.
 *
 * Compose `base` + one `chipSize` step, then `interactive` when the chip is a
 * control, then `active` when it is the selected one. Pair `interactive` with
 * the `transition.colors` motion primitive at the call site so the hover eases
 * rather than snaps.
 *
 * `interactive` re-declares the hover-sensitive properties so the layers compose
 * cleanly (last write wins per property), and carries the shared keyboard focus
 * ring (WCAG 2.4.7) — inlined rather than composed, because a style-object
 * primitive cannot compose another one at definition time.
 */
export const chipSurface = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    gap: space._0,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_round,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
    color: color.textMain,
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_2,
    textDecoration: "none",
  },
  interactive: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.accentBorder,
      ":disabled:hover": color.neutralBorder,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgInteractiveHover,
      ":disabled:hover": color.bgSurface,
    },
    opacity: { default: null, ":disabled": opacity.disabled },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: { default: "transparent", ":focus-visible": color.accent },
    outlineOffset: border.size_2,
  },
  active: {
    borderColor: { default: color.accent, ":hover": color.accentHover },
    backgroundColor: { default: color.accent, ":hover": color.accentHover },
    color: { default: color.accentOn, ":hover": color.accentOn },
  },
});

/**
 * Height and type steps for a chip. Split from `chipSurface` so a hand-composed
 * chip picks its size the same way the component's `size` prop does. Heights use
 * `controlSize`, so every step grows on touch viewports.
 */
export const chipSize = stylex.create({
  sm: {
    minBlockSize: controlSize._6,
    paddingBlock: controlSize._0,
    paddingInline: controlSize._2,
    fontSize: font.uiCaption,
  },
  md: {
    minBlockSize: controlSize._8,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    fontSize: font.uiBodySmall,
  },
});
